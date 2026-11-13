package com.ecoresiduos.llano.domain.port;

import com.ecoresiduos.llano.domain.model.Ruta;

public interface IPuertoRutasViales {
    void consultar(Ruta ruta, double latOrigen, double lonOrigen, double latDestino, double lonDestino);
}
