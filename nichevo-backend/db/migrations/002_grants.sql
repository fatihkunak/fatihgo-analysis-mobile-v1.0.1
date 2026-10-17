-- Çalışma zamanı rolü (nichevo_app) için AÇIK tablo yetkileri.
-- Ders (scenefx 053/057): "süper kullanıcı zaten her şeyi yapar" varsayımı yanlış; rol süper kullanıcı değilse
-- GRANT olmadan her sorgu "permission denied for table" ile sessizce kırılır. Bu yüzden hem mevcut tablolara
-- hem de gelecekte eklenecek tablolara (DEFAULT PRIVILEGES) yetki veriyoruz.
DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO nichevo_app', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO nichevo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nichevo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nichevo_app;

ALTER DEFAULT PRIVILEGES FOR ROLE nichevo_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nichevo_app;
ALTER DEFAULT PRIVILEGES FOR ROLE nichevo_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO nichevo_app;
