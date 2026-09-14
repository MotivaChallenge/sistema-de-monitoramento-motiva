ALTER TABLE public.field_height_measurements
  ADD COLUMN IF NOT EXISTS satellite_image_date date,
  ADD COLUMN IF NOT EXISTS location_type text,
  ADD COLUMN IF NOT EXISTS temporal_difference_days integer
    GENERATED ALWAYS AS (
      CASE WHEN satellite_image_date IS NULL THEN NULL
           ELSE abs(measured_at - satellite_image_date) END
    ) STORED;

COMMENT ON COLUMN public.field_height_measurements.satellite_image_date IS 'Data da imagem Sentinel pareada com esta medição de campo.';
COMMENT ON COLUMN public.field_height_measurements.location_type IS 'Tipo de ambiente do ponto (roundabout, rural, urbano...).';
COMMENT ON COLUMN public.field_height_measurements.temporal_difference_days IS 'Defasagem em dias entre a imagem de satélite e a medição de campo.';