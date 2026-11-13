package com.ecoresiduos.llano.domain.model;

import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.control.DeepClone;
import org.mapstruct.factory.Mappers;

/** Copia los datos operativos del escenario; la identidad y el linaje se fijan al crear la variante. */
@Mapper(mappingControl = DeepClone.class, unmappedTargetPolicy = ReportingPolicy.ERROR,
        disableSubMappingMethodsGeneration = true)
public interface CopiadorEscenarios {

    CopiadorEscenarios INSTANCE = Mappers.getMapper(CopiadorEscenarios.class);

    @Mapping(target = "referencia_id", ignore = true)
    @Mapping(target = "variaciones", ignore = true)
    @Mapping(target = "referencia_snapshot", ignore = true)
    @Mapping(target = "oferta_total_t", ignore = true)
    @Mapping(target = "capacidad_total_t", ignore = true)
    @Mapping(target = "aviso_capacidad", ignore = true)
    Escenario copiarDatosOperativos(Escenario origen);

    Empresa copiarEmpresa(Empresa origen);

    Planta copiarPlanta(Planta origen);

    NodoPaso copiarNodoPaso(NodoPaso origen);

    Ruta copiarRuta(Ruta origen);

    List<List<Double>> copiarGeometria(List<List<Double>> origen);

    List<Double> copiarPunto(List<Double> origen);
}
