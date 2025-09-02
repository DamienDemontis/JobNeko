-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Companies policies (public read, authenticated users can create/update)
CREATE POLICY "Anyone can read companies" ON public.companies
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create companies" ON public.companies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update companies" ON public.companies
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Jobs policies (public read, authenticated users can create/update)
CREATE POLICY "Anyone can read jobs" ON public.jobs
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create jobs" ON public.jobs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update jobs" ON public.jobs
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Applications policies (users can only see/modify their own)
CREATE POLICY "Users can read own applications" ON public.applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own applications" ON public.applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications" ON public.applications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications" ON public.applications
    FOR DELETE USING (auth.uid() = user_id);

-- Application status history policies (users can only see their own)
CREATE POLICY "Users can read own application history" ON public.application_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.applications 
            WHERE applications.id = application_id 
            AND applications.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create application history for own applications" ON public.application_status_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.applications 
            WHERE applications.id = application_id 
            AND applications.user_id = auth.uid()
        )
    );

-- Function to automatically create status history when application status changes
CREATE OR REPLACE FUNCTION public.create_application_status_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history entry if status actually changed
    IF OLD IS NULL OR OLD.status != NEW.status THEN
        INSERT INTO public.application_status_history (application_id, status, notes)
        VALUES (NEW.id, NEW.status, 'Status changed to ' || NEW.status);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create trigger for automatic status history
CREATE TRIGGER create_application_status_history_trigger
    AFTER INSERT OR UPDATE OF status ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.create_application_status_history();

-- Function to handle user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();