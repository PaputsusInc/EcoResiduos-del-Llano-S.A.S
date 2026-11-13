package com.ecoresiduos.llano.domain.port;

import com.ecoresiduos.llano.domain.model.Escenario;
import java.util.List;

public interface IPuertoValidadorEscenario {
    List<String> validar_integridad_escenario(Escenario escenario);
}
