-- Reserve the owner's Fresh Mail address. It is 'pending': sign-in and recovery by Fresh Mail address only work
-- for 'active' addresses, and an address becomes active only after its domain is verified for sending and
-- receiving with the mail provider (see api/mail.ts provisioning). Reserving it now stops anyone else taking it.
-- Does nothing if the owner account or the address already exists.

insert into public.fresh_mail_addresses (owner_id, email_address, status)
select u.id, 'memphisarafat@fmail.com', 'pending'
from public.users u
where u.role = 'owner'
  and not exists (select 1 from public.fresh_mail_addresses a where lower(a.email_address) = 'memphisarafat@fmail.com')
  and not exists (select 1 from public.fresh_mail_addresses a where a.owner_id = u.id and a.status = 'pending' and lower(a.email_address) = 'memphisarafat@fmail.com');
