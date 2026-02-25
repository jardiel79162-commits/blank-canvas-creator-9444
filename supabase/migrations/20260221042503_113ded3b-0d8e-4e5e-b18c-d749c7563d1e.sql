CREATE POLICY "Users can delete their own remix history"
ON public.remix_history FOR DELETE
USING (auth.uid() = user_id);