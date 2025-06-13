const projectTable = 'projects';

export async function insertProject(supabase, projectName, problem, description, nickname) {
    const { data, error } = await supabase
        .from(projectTable)
        .insert({
            project_name: projectName,
            description: description,
            problem: problem,
            nickname: nickname
        })
        .select()

    if (error) {
        throw error;
    }

    return data
}

export async function selectProjects(supabase) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from(projectTable)
        .select("*")
        .eq('user_id', user.id);

    if (error) {
        throw error;
    }

    return data
}

export async function selectProjectBy(supabase, column, value) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from(projectTable)
        .select("*")
        .eq('user_id', user.id)
        .eq(column, value);

    if (error) {
        throw error;
    }

    return data
}