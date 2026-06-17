-- =====================================================================
-- 0009_saldo_total_bruto.sql
-- Corrección de criterio de saldo de vacaciones:
-- Se usa la columna "TOTAL DIAS" (col L del Excel = saldo BRUTO acumulado:
-- años anteriores + 2025 + generado 2026), NO "TOTAL DIAS PENDIENTES"
-- (col AL, que descontaba los días ya programados en 2026).
--
-- Ejemplo: Soledad González — antes 172 (neto), ahora 181 (bruto), que es
-- lo correcto: 151 (años anteriores) + 30 (2026), sin restar lo programado.
--
-- dias_base = MAX(saldo bruto del Excel, devengo del periodo vigente desde
-- el ingreso) para que los recién ingresados no queden en 0.
-- Los valores por cédula se cargan desde el Excel VACACIONES 2026 (col L).
-- Esta migración documenta el criterio; la carga de valores se hizo por dato.
-- =====================================================================

-- Sincronizar dias_pendientes con la base (referencia del criterio aplicado)
update employees set dias_pendientes = dias_base where dias_base is not null;
