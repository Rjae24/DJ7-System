-- Script de Inyección de Datos de Prueba para DJ7 System
DO $$
DECLARE
  v_admin_id UUID := 'c22e24da-600d-4f55-ac70-326df2198ec7';
  v_cat_audio UUID;
  v_cat_luces UUID;
  v_cat_dj UUID;
  v_cat_cables UUID;
  
  v_prod_parlante UUID;
  v_prod_subwoofer UUID;
  v_prod_beam UUID;
  v_prod_parled UUID;
  v_prod_controlador UUID;
  v_prod_audifonos UUID;
  v_prod_cable_xlr UUID;
  v_prod_microfono UUID;

  v_cli_1 UUID;
  v_cli_2 UUID;
  v_cli_3 UUID;
  v_cli_4 UUID;

  v_prov_1 UUID;
  v_prov_2 UUID;

  v_tasa_1 UUID;
  v_tasa_2 UUID;
  v_tasa_hoy UUID;

  v_fact_1 UUID;
  v_fact_2 UUID;
  v_fact_3 UUID;
  v_fact_4 UUID;
BEGIN
  -- 1. Tasas de Cambio históricas
  INSERT INTO public.tasas_cambio (id, tasa_usd_bs, fecha_registro, registrado_por)
  VALUES 
    (gen_random_uuid(), 485.2000, CURRENT_DATE - INTERVAL '2 days', v_admin_id),
    (gen_random_uuid(), 492.5000, CURRENT_DATE - INTERVAL '1 day', v_admin_id)
  ON CONFLICT (fecha_registro) DO NOTHING;

  INSERT INTO public.tasas_cambio (id, tasa_usd_bs, fecha_registro, registrado_por)
  VALUES (gen_random_uuid(), 499.8608, CURRENT_DATE, v_admin_id)
  ON CONFLICT (fecha_registro) DO UPDATE SET tasa_usd_bs = 499.8608
  RETURNING id INTO v_tasa_hoy;

  SELECT id INTO v_tasa_hoy FROM public.tasas_cambio WHERE fecha_registro = CURRENT_DATE LIMIT 1;

  -- 2. Categorías
  INSERT INTO public.categorias (id, nombre, descripcion)
  VALUES 
    (gen_random_uuid(), 'Audio Profesional', 'Cornetas activas, subwoofers y sistemas de amplificación PA'),
    (gen_random_uuid(), 'Iluminación Escénica', 'Cabezas móviles, focos LED Par y efectos DMX'),
    (gen_random_uuid(), 'Equipos DJ', 'Controladores, tornamesas, mixers y audífonos para DJ'),
    (gen_random_uuid(), 'Cables y Accesorios', 'Cables balanceados XLR, conectores Speakon y pedestales')
  ON CONFLICT (nombre) DO NOTHING;

  SELECT id INTO v_cat_audio FROM public.categorias WHERE nombre = 'Audio Profesional' LIMIT 1;
  SELECT id INTO v_cat_luces FROM public.categorias WHERE nombre = 'Iluminación Escénica' LIMIT 1;
  SELECT id INTO v_cat_dj FROM public.categorias WHERE nombre = 'Equipos DJ' LIMIT 1;
  SELECT id INTO v_cat_cables FROM public.categorias WHERE nombre = 'Cables y Accesorios' LIMIT 1;

  -- 3. Productos
  INSERT INTO public.productos (sku, nombre, descripcion, precio_usd, stock, stock_minimo, categoria_id, activo)
  VALUES
    ('AUD-001', 'Corneta Activa 15" DJ7 Pro 1000W', 'Parlante activo bi-amplificado con Bluetooth y DSP digital', 280.00, 18, 5, v_cat_audio, true),
    ('AUD-002', 'Subwoofer Activo 18" 1500W RMS', 'Bajo de alta potencia con crossover integrado', 450.00, 8, 3, v_cat_audio, true),
    ('AUD-003', 'Kit Micrófonos Inalámbricos Doble UHF', 'Sistema inalámbrico profesional con 100 metros de alcance', 85.00, 25, 6, v_cat_audio, true),
    ('LGT-001', 'Cabeza Móvil Beam 7R 230W DMX', 'Luz robótica de haz concentrado con rueda de gobos y colores', 195.00, 12, 4, v_cat_luces, true),
    ('LGT-002', 'Foco LED Slim Par 18x12W RGBW', 'Luminaria plana para ambientación y escenarios', 38.00, 32, 10, v_cat_luces, true),
    ('LGT-003', 'Máquina de Humo 1500W con Control Remoto', 'Generador de humo denso con protección térmica', 65.00, 4, 5, v_cat_luces, true), -- Stock crítico
    ('DJ-001', 'Controlador DJ 4 Canales Serato / Rekordbox', 'Controladora para DJs profesionales con pads RGB', 340.00, 7, 2, v_cat_dj, true),
    ('DJ-002', 'Audífonos DJ Monitoreo Alta Definición', 'Driver de 50mm, aislación pasiva superior y cable espiral', 55.00, 20, 5, v_cat_dj, true),
    ('CAB-001', 'Cable XLR Balanceado Micrófono 10 Metros', 'Conectores metálicos reforzados libre de ruido', 12.50, 45, 15, v_cat_cables, true),
    ('CAB-002', 'Cable Speakon a Speakon 15 Metros', 'Cable de alta resistencia calibre 2x2.5mm', 18.00, 3, 10, v_cat_cables, true) -- Stock crítico
  ON CONFLICT (sku) DO NOTHING;

  -- 4. Clientes
  INSERT INTO public.clientes (nombre, documento_identidad, telefono, email, direccion)
  VALUES
    ('Inversiones Sonido Urbano C.A.', 'J-40982314-5', '0414-1234567', 'eventos@sonidourbano.com', 'Av. Francisco de Miranda, Chacao, Caracas'),
    ('Carlos Eduardo Mendoza', 'V-19842516', '0412-9876543', 'carloseduardo_dj@gmail.com', 'El Cafetal, Baruta'),
    ('Discoteca Sahara Club C.A.', 'J-50182736-2', '0424-5551234', 'administracion@saharaclub.com', 'Las Mercedes, Caracas'),
    ('Mariana Rodríguez', 'V-24651980', '0416-8889922', 'marianaprod@outlook.com', 'San Antonio de los Altos')
  ON CONFLICT (documento_identidad) DO NOTHING;

  SELECT id INTO v_cli_1 FROM public.clientes WHERE documento_identidad = 'J-40982314-5' LIMIT 1;
  SELECT id INTO v_cli_2 FROM public.clientes WHERE documento_identidad = 'V-19842516' LIMIT 1;
  SELECT id INTO v_cli_3 FROM public.clientes WHERE documento_identidad = 'J-50182736-2' LIMIT 1;
  SELECT id INTO v_cli_4 FROM public.clientes WHERE documento_identidad = 'V-24651980' LIMIT 1;

  -- 5. Proveedores
  INSERT INTO public.proveedores (nombre, rif, telefono, email, direccion, contacto_nombre, activo)
  VALUES
    ('Importadora Audio Global C.A.', 'J-30512894-1', '0212-9098765', 'ventas@audioglobal.com.ve', 'Zona Industrial La Yaguara, Caracas', 'Ing. Roberto Gómez', true),
    ('Luminarias y Escenario Caracas C.A.', 'J-40112233-8', '0212-7654321', 'contacto@lumicaracas.com', 'Sabana Grande, Edif. Centro, Caracas', 'Elena Martínez', true)
  ON CONFLICT (rif) DO NOTHING;

  -- 6. Facturas de Prueba y Detalles
  SELECT id INTO v_prod_parlante FROM public.productos WHERE sku = 'AUD-001' LIMIT 1;
  SELECT id INTO v_prod_beam FROM public.productos WHERE sku = 'LGT-001' LIMIT 1;
  SELECT id INTO v_prod_controlador FROM public.productos WHERE sku = 'DJ-001' LIMIT 1;
  SELECT id INTO v_prod_audifonos FROM public.productos WHERE sku = 'DJ-002' LIMIT 1;
  SELECT id INTO v_prod_cable_xlr FROM public.productos WHERE sku = 'CAB-001' LIMIT 1;
  SELECT id INTO v_prod_microfono FROM public.productos WHERE sku = 'AUD-003' LIMIT 1;

  -- Factura 1: Venta completa a Sahara Club
  INSERT INTO public.facturas (
    id, numero_factura, cliente_id, vendedor_id, tasa_id, subtotal_usd, descuento_usd, total_usd, total_bs,
    metodos_pago, estado, fecha_emision
  ) VALUES (
    gen_random_uuid(), 'DJ7-202609-0001', v_cli_3, v_admin_id, v_tasa_hoy, 955.00, 0, 955.00, 955.00 * 499.8608,
    '[
      {"metodo": "Zelle", "monto_usd": 500.00, "referencia": "ZLL-982173"},
      {"metodo": "Pago Móvil", "monto_usd": 455.00, "monto_bs": 227436.66, "referencia": "PM-481923"}
    ]'::jsonb,
    'emitida', CURRENT_TIMESTAMP - INTERVAL '3 days'
  ) RETURNING id INTO v_fact_1;

  INSERT INTO public.detalles_factura (factura_id, producto_id, producto_nombre, cantidad, precio_unitario_usd, subtotal_usd)
  VALUES
    (v_fact_1, v_prod_parlante, 'Corneta Activa 15" DJ7 Pro 1000W', 2, 280.00, 560.00),
    (v_fact_1, v_prod_beam, 'Cabeza Móvil Beam 7R 230W DMX', 2, 195.00, 390.00),
    (v_fact_1, v_prod_cable_xlr, 'Cable XLR Balanceado Micrófono 10 Metros', 4, 1.25, 5.00);

  -- Factura 2: Venta a Carlos DJ
  INSERT INTO public.facturas (
    id, numero_factura, cliente_id, vendedor_id, tasa_id, subtotal_usd, descuento_usd, total_usd, total_bs,
    metodos_pago, estado, fecha_emision
  ) VALUES (
    gen_random_uuid(), 'DJ7-202609-0002', v_cli_2, v_admin_id, v_tasa_hoy, 395.00, 0, 395.00, 395.00 * 499.8608,
    '[
      {"metodo": "Efectivo USD", "monto_usd": 395.00}
    ]'::jsonb,
    'emitida', CURRENT_TIMESTAMP - INTERVAL '1 day'
  ) RETURNING id INTO v_fact_2;

  INSERT INTO public.detalles_factura (factura_id, producto_id, producto_nombre, cantidad, precio_unitario_usd, subtotal_usd)
  VALUES
    (v_fact_2, v_prod_controlador, 'Controlador DJ 4 Canales Serato / Rekordbox', 1, 340.00, 340.00),
    (v_fact_2, v_prod_audifonos, 'Audífonos DJ Monitoreo Alta Definición', 1, 55.00, 55.00);

  -- Factura 3: Venta hoy a Inversiones Sonido Urbano
  INSERT INTO public.facturas (
    id, numero_factura, cliente_id, vendedor_id, tasa_id, subtotal_usd, descuento_usd, total_usd, total_bs,
    metodos_pago, estado, fecha_emision
  ) VALUES (
    gen_random_uuid(), 'DJ7-202609-0003', v_cli_1, v_admin_id, v_tasa_hoy, 450.00, 0, 450.00, 450.00 * 499.8608,
    '[
      {"metodo": "Punto de Venta", "monto_usd": 250.00, "monto_bs": 124965.20, "referencia": "POS-817263"},
      {"metodo": "Efectivo USD", "monto_usd": 200.00}
    ]'::jsonb,
    'emitida', CURRENT_TIMESTAMP - INTERVAL '4 hours'
  ) RETURNING id INTO v_fact_3;

  INSERT INTO public.detalles_factura (factura_id, producto_id, producto_nombre, cantidad, precio_unitario_usd, subtotal_usd)
  VALUES
    (v_fact_3, v_prod_microfono, 'Kit Micrófonos Inalámbricos Doble UHF', 2, 85.00, 170.00),
    (v_fact_3, v_prod_parlante, 'Corneta Activa 15" DJ7 Pro 1000W', 1, 280.00, 280.00);

  -- Factura 4: Venta Mariana Rodríguez
  INSERT INTO public.facturas (
    id, numero_factura, cliente_id, vendedor_id, tasa_id, subtotal_usd, descuento_usd, total_usd, total_bs,
    metodos_pago, estado, fecha_emision
  ) VALUES (
    gen_random_uuid(), 'DJ7-202609-0004', v_cli_4, v_admin_id, v_tasa_hoy, 114.00, 0, 114.00, 114.00 * 499.8608,
    '[
      {"metodo": "Pago Móvil", "monto_usd": 114.00, "monto_bs": 56984.13, "referencia": "PM-990112"}
    ]'::jsonb,
    'emitida', CURRENT_TIMESTAMP - INTERVAL '1 hour'
  ) RETURNING id INTO v_fact_4;

  INSERT INTO public.detalles_factura (factura_id, producto_id, producto_nombre, cantidad, precio_unitario_usd, subtotal_usd)
  VALUES
    (v_fact_4, v_prod_audifonos, 'Audífonos DJ Monitoreo Alta Definición', 1, 55.00, 55.00),
    (v_fact_4, v_prod_cable_xlr, 'Cable XLR Balanceado Micrófono 10 Metros', 4, 14.75, 59.00);

END $$;
