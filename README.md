# Mis finanzas

Primera versión simple para llevar ingresos y gastos en pesos chilenos.

## Abrir

Abre `dist/index.html` en un navegador moderno. No necesita instalación, servidor, cuenta ni conexión a internet. Los archivos `index.html`, `styles.css` y `app.js` deben permanecer juntos.

## Uso

- Registra un ingreso o gasto con descripción, fecha, categoría y monto entero positivo.
- Elige un mes para ver ingresos, gastos, balance y distribución de gastos por categoría.
- Busca movimientos o filtra por tipo. Los filtros no alteran los totales mensuales.
- Elimina movimientos después de confirmar.
- Descarga un respaldo JSON de todos los meses. Restaurarlo reemplaza los datos actuales, previa confirmación.

## Datos

Los movimientos se guardan únicamente en `localStorage` del navegador. No se envían a GitHub ni a un servidor. Cambiar de navegador, dispositivo o dirección de la app no mueve los datos: usa el respaldo para trasladarlos. La navegación privada o borrar datos del navegador puede eliminarlos. En archivos locales, algunos navegadores restringen el almacenamiento; la app informa cuando no puede guardar.

La aplicación comienza vacía. La planilla Excel original no se modifica ni se importa automáticamente. El balance es la diferencia entre ingresos y gastos registrados para el mes, no el saldo bancario. Esta versión no calcula cuotas, deudas ni cuentas por cobrar.

Límites: 5.000 movimientos, montos de hasta 1.000.000.000.000 CLP y respaldos de hasta 5 MB. Sin dependencias externas.

## Publicación estática

Sirve la carpeta `dist` en un hosting estático mediante HTTPS. Mantén el mismo origen para conservar los datos del navegador y descarga un respaldo antes de cambiar de dirección.
