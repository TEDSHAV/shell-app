"use client";

import { ManualArticle } from "@/components/manual/ManualArticle";
import { DEPOSITO_TAB_HELP } from "../lib/req-stock-types";
import {
  DemoArticleCard,
  DemoConsumoBlock,
  DemoHistorialRow,
  DemoInvTabs,
  DemoStockAnalisis,
  ManualFigure,
} from "./manual-ui-demos";

export function InventarioManual() {
  return (
    <ManualArticle
      kicker="Inventario"
      title="Manual de inventario"
      lead="Cómo ver qué hay en cada almacén, registrar lo que ya usaste y pedir reposición sin perderte en la pantalla."
      chips={[
        { id: "manual-almacenes", label: "Los tres almacenes" },
        { id: "manual-articulos", label: "Artículos" },
        { id: "manual-consumo", label: "Consumo" },
        { id: "manual-pedido", label: "Pedido y análisis" },
        { id: "manual-historial", label: "Historial" },
        { id: "manual-minimos-excel", label: "Mínimos y Excel" },
      ]}
      sections={[
        {
          id: "manual-almacenes",
          title: "Los tres almacenes",
          body: (
            <>
              <p>
                Arriba tenés pestañas. Cada una es un tipo de almacén distinto.
                No mezclan el material del departamento con el de un curso.
              </p>
              <ManualFigure
                title="Así se ven las pestañas"
                caption="Elegí la pestaña del almacén que te interesa antes de buscar un artículo."
              >
                <DemoInvTabs />
              </ManualFigure>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Departamentos:</strong>{" "}
                  {DEPOSITO_TAB_HELP.departamento}
                </li>
                <li>
                  <strong>Serv. capacitación:</strong>{" "}
                  {DEPOSITO_TAB_HELP.capacitacion}
                </li>
                <li>
                  <strong>Serv. técnico:</strong> {DEPOSITO_TAB_HELP.tecnico}
                </li>
              </ul>
              <p>
                En <strong>Departamentos</strong> entrá al área (Marketing, RH,
                Capacitación, etc.): siempre es el{" "}
                <strong>almacén interno de ese departamento</strong> — lo que
                el área usa para trabajar, no material de un curso. Si el
                departamento se llama Capacitación, igual es uso interno del
                área; no es el depósito de ejecución de cursos.
              </p>
              <p>
                Los depósitos de ejecución (aguas, kits, insumos de OSI) están
                en las pestañas <strong>Serv. capacitación</strong> y{" "}
                <strong>Serv. técnico</strong>, no dentro de Departamentos.
              </p>
            </>
          ),
        },
        {
          id: "manual-articulos",
          title: "Artículos y estados",
          body: (
            <>
              <p>
                Cada fila es un artículo. A la derecha ves si hay cantidad y el
                estado:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>En stock</strong> — hay suficiente según el mínimo.
                </li>
                <li>
                  <strong>Bajo</strong> — queda poco; conviene pedir.
                </li>
                <li>
                  <strong>Agotado</strong> — cantidad en cero.
                </li>
              </ul>
              <ManualFigure
                title="Lista de artículos"
                caption="Tocá una fila para abrir el detalle a la derecha (consumo, historial, etc.)."
              >
                <div className="space-y-2">
                  <DemoArticleCard
                    nombre="AGUAS"
                    ubicacion="Ejecución Capacitación"
                    cantidad="2.00"
                    unidad="CAJA"
                    nivel="en_stock"
                  />
                  <DemoArticleCard
                    nombre="GALLETAS"
                    ubicacion="Ejecución Capacitación"
                    cantidad="0.00"
                    unidad="CAJA"
                    nivel="agotado"
                  />
                </div>
              </ManualFigure>
              <p>
                Podés buscar por nombre arriba. Si no aparece un artículo que
                sí está en el catálogo como inventario externo, puede ser que
                aún no tenga ficha en este almacén: al abrir Inventario el
                sistema intenta crearlas en cero.
              </p>
            </>
          ),
        },
        {
          id: "manual-consumo",
          title: "Registrar consumo",
          body: (
            <>
              <p>
                Cuando ya usaste material del almacén, registralo acá (si tu
                rol lo permite). No cambia la cantidad de la requisición: solo
                baja el stock.
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>Abrí el artículo.</li>
                <li>
                  En <strong>Consumo del stock actual</strong>, bajá con{" "}
                  <strong>−</strong> (el número muestra lo que quedaría).
                </li>
                <li>
                  Tocá <strong>Actualizar stock</strong> para guardar. Hasta
                  entonces el cambio es solo una vista previa.
                </li>
                <li>
                  <strong>Marcar agotado</strong> deja el consumo pendiente en
                  todo lo que hay; igual hay que confirmar con Actualizar
                  stock.
                </li>
              </ol>
              <ManualFigure
                title="Bloque de consumo"
                caption="El + solo aparece si ya bajaste algo: sirve para deshacer hasta el stock real."
              >
                <DemoConsumoBlock />
              </ManualFigure>
            </>
          ),
        },
        {
          id: "manual-pedido",
          title: "Pedido y análisis en la requisición",
          body: (
            <>
              <p>
                Al armar una requisición de inventario (interna o de
                reposición), debajo de la tabla aparece{" "}
                <strong>Stock actual de estos ítems</strong>. Ahí ves, al
                mismo tiempo:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Cuánto hay hoy.</li>
                <li>Cuánto pedís en la requisición.</li>
                <li>Si marcás consumo, cuánto quedaría.</li>
              </ul>
              <ManualFigure
                title="Análisis junto al pedido"
                caption="Arriba la cuenta Stock − Consumo + Pedido. Abajo: bloque verde (cantidad de la req) y bloque rosa (consumo del stock)."
              >
                <DemoStockAnalisis />
              </ManualFigure>
              <p>
                El bloque verde ajusta la cantidad de la tabla de la
                requisición. El bloque rosa registra consumo del stock. Son
                independientes: no hace falta “deshacer” el pedido para marcar
                un consumo.
              </p>
            </>
          ),
        },
        {
          id: "manual-historial",
          title: "Historial de movimientos",
          body: (
            <>
              <p>
                En el detalle del artículo (o en el análisis de la
                requisición) podés abrir{" "}
                <strong>Historial de movimientos</strong>: ingresos, consumos
                y fechas. Sirve para revisar quién bajó o subió stock.
              </p>
              <ManualFigure
                title="Desplegable de historial"
                caption="Se carga al abrirlo. Después de Actualizar stock se refresca solo."
              >
                <DemoHistorialRow />
              </ManualFigure>
            </>
          ),
        },
        {
          id: "manual-minimos-excel",
          title: "Mínimos y Excel",
          body: (
            <>
              <p>
                Si tu rol lo permite, verás{" "}
                <strong>Configurar mínimos</strong>: define desde qué cantidad
                el artículo pasa a “Bajo”. Podés fijar un mínimo general, por
                categoría o por artículo.
              </p>
              <p>
                <strong>Cargar Excel</strong> sirve para dar de alta o
                actualizar muchos artículos de inventario de una vez. Es un
                asistente con pasos: no hace falta editar fila por fila si
                traés el archivo listo.
              </p>
              <p>
                Si no ves esos botones, pedile a quien administra el sistema:
                dependen del permiso, no de un error de la pantalla.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
