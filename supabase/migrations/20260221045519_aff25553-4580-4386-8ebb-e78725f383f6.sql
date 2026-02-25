-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete payments
CREATE POLICY "Admins can delete payments"
ON public.payments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
