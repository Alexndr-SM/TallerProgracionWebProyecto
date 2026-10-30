INSERT INTO recompensas (nombre, descripcion, tipo, puntos, imagen_url)
SELECT 'Sombrero ICATURISMO', 'Lleva contigo un sombrero oficial de ICATURISMO y disfruta tus aventuras bajo el sol.', 'producto', 750, ''
WHERE NOT EXISTS (SELECT 1 FROM recompensas WHERE nombre = 'Sombrero ICATURISMO');

INSERT INTO recompensas (nombre, descripcion, tipo, puntos, imagen_url)
SELECT 'Sombrilla ICATURISMO', 'Una sombrilla práctica para acompañarte en tus días de playa y paseo.', 'producto', 1000, ''
WHERE NOT EXISTS (SELECT 1 FROM recompensas WHERE nombre = 'Sombrilla ICATURISMO');
