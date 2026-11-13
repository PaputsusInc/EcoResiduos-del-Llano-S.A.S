package com.ecoresiduos.llano.infrastructure.routing;

import com.ecoresiduos.llano.domain.model.Ruta;
import com.ecoresiduos.llano.domain.port.IPuertoRutasViales;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Component
public class AdaptadorRutasViales implements IPuertoRutasViales {
    private final HttpClient cliente;
    private final ObjectMapper json;

    public AdaptadorRutasViales(HttpClient cliente, ObjectMapper json) {
        this.cliente = cliente;
        this.json = json;
    }

    @Override
    public void consultar(Ruta ruta, double latO, double lonO, double latD, double lonD) {
        String url = String.format(Locale.US,
                "https://router.project-osrm.org/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=full&geometries=geojson",
                lonO, latO, lonD, latD);
        try {
            HttpRequest peticion = HttpRequest.newBuilder().uri(URI.create(url))
                    .timeout(Duration.ofMillis(3500)).GET().build();
            HttpResponse<String> respuesta = cliente.send(peticion, HttpResponse.BodyHandlers.ofString());
            if (respuesta.statusCode() == 200) {
                JsonNode raiz = json.readTree(respuesta.body());
                String codigo = raiz.path("code").asText();
                if ("Ok".equalsIgnoreCase(codigo) && raiz.path("routes").isArray()
                        && !raiz.path("routes").isEmpty()) {
                    JsonNode recorrido = raiz.path("routes").get(0);
                    double distanciaKm = Math.round(recorrido.path("distance").asDouble() / 100.0) / 10.0;
                    List<List<Double>> geometria = new ArrayList<>();
                    for (JsonNode punto : recorrido.path("geometry").path("coordinates")) {
                        if (punto.isArray() && punto.size() >= 2) {
                            geometria.add(List.of(punto.get(0).asDouble(), punto.get(1).asDouble()));
                        }
                    }
                    ruta.registrar_recorrido_vial(distanciaKm, geometria, "OSRM", "calculada");
                    return;
                }
                if ("NoRoute".equalsIgnoreCase(codigo)) {
                    ruta.registrar_recorrido_vial(null, Collections.emptyList(), "OSRM", "sin_ruta");
                    return;
                }
            }
        } catch (Exception ignorada) {
            // La estimación queda identificada como tal cuando el servicio no responde.
        }
        if (ruta.getDistancia_km() == null) {
            double km = Math.round(haversine(latO, lonO, latD, lonD) * 1.35 * 10.0) / 10.0;
            ruta.registrar_recorrido_vial(km,
                    List.of(List.of(lonO, latO), List.of(lonD, latD)),
                    "Estimación geográfica × 1,35", "calculada");
        }
    }

    private static double haversine(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
