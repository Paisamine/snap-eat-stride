
CREATE POLICY "food images own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "food images own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "food images own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
