-- Create function to handle user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    new_username text;
    new_name text;
begin
    -- Generate username from email if not provided
    new_username := coalesce(
        new.raw_user_meta_data->>'username',
        split_part(new.email, '@', 1)
    );
    
    -- Generate name from username or email
    new_name := coalesce(
        new.raw_user_meta_data->>'name',
        new_username
    );

    -- Insert into profiles
    insert into public.profiles (id, username, name)
    values (
        new.id,
        new_username,
        new_name
    );

    return new;
exception
    when unique_violation then
        -- If username exists, append random numbers
        new_username := new_username || '_' || floor(random() * 1000)::text;
        insert into public.profiles (id, username, name)
        values (
            new.id,
            new_username,
            new_name
        );
        return new;
end;
$$;

-- Create trigger for new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user(); 