-- Atomic stock deduction: only deducts if enough stock exists (WHERE stock >= qty),
-- returning whether it succeeded. Prevents concurrent dispenses driving stock negative.
create or replace function public.deduct_medicine_stock(p_id uuid, p_qty int)
returns boolean language plpgsql security definer set search_path = public as $$
declare updated int;
begin
  update public.medicines set stock = stock - p_qty
   where id = p_id and stock >= p_qty;
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

grant execute on function public.deduct_medicine_stock(uuid, int) to anon, authenticated;
