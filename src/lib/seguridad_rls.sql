-- ====================================================================
-- SCRIPT DE BLINDAJE DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- PROYECTO: DJ7 System
-- OBJETIVO: Bloquear totalmente el acceso a usuarios anónimos (anon)
--           y permitir acceso exclusivo a usuarios autenticados.
-- ====================================================================

-- 1. ACTIVAR ROW LEVEL SECURITY EN TODAS LAS TABLAS DEL ESQUEMA PUBLIC
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalles_factura ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasas_cambio ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 2. LIMPIEZA DE POLÍTICAS PREVIAS (Para evitar duplicados)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Acceso total para usuarios autenticados en usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Acceso total para usuarios autenticados en productos" ON public.productos;
DROP POLICY IF EXISTS "Acceso total para usuarios autenticados en categorias" ON public.categorias;
DROP POLICY IF EXISTS "Acceso total para usuarios autenticados en clientes" ON public.clientes;
DROP POLICY IF EXISTS "Acceso total para usuarios autenticados en proveedores" ON public.proveedores;
DROP POLICY IF EXISTS "Acceso total para usuarios autenticados en facturas" ON public.facturas;
DROP POLICY IF EXISTS "Acceso total para usuarios autenticados en detalles_factura" ON public.detalles_factura;
DROP POLICY IF EXISTS "Acceso total para usuarios autenticados en tasas_cambio" ON public.tasas_cambio;

-- Eliminar políticas antiguas con otros nombres si existieran
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Solo administradores pueden modificar usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver productos" ON public.productos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver categorias" ON public.categorias;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden registrar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar clientes" ON public.clientes;

-- --------------------------------------------------------------------
-- 3. CREAR POLÍTICAS: ACCESO EXCLUSIVO PARA USUARIOS AUTENTICADOS
-- --------------------------------------------------------------------

-- Tabla: usuarios
CREATE POLICY "Acceso total para usuarios autenticados en usuarios"
ON public.usuarios
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Tabla: productos
CREATE POLICY "Acceso total para usuarios autenticados en productos"
ON public.productos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Tabla: categorias
CREATE POLICY "Acceso total para usuarios autenticados en categorias"
ON public.categorias
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Tabla: clientes
CREATE POLICY "Acceso total para usuarios autenticados en clientes"
ON public.clientes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Tabla: proveedores
CREATE POLICY "Acceso total para usuarios autenticados en proveedores"
ON public.proveedores
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Tabla: facturas
CREATE POLICY "Acceso total para usuarios autenticados en facturas"
ON public.facturas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Tabla: detalles_factura
CREATE POLICY "Acceso total para usuarios autenticados en detalles_factura"
ON public.detalles_factura
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Tabla: tasas_cambio
CREATE POLICY "Acceso total para usuarios autenticados en tasas_cambio"
ON public.tasas_cambio
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
