const PROJECT_TABLE = 'projects';
const RAIL_TABLE = 'rail';
const STACK_TABLE = 'stack';

export async function insertProject(supabase, projectName, problem, description, nickname) {
    const { data, error } = await supabase
        .from(PROJECT_TABLE)
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
        .from(PROJECT_TABLE)
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
        .from(PROJECT_TABLE)
        .select("*")
        .eq('user_id', user.id)
        .eq(column, value);

    if (error) {
        throw error;
    }

    return data
}

export async function selectUserTags(supabase, projectId) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }
    /*
        SELECT DISTINCT t.tag
        FROM stack AS tk
        JOIN tags AS t
        ON tk.id = t.id
        WHERE tk.user_id = 'your_user_id_here'
        AND tk.project_id = 'your_project_id_here';
     */
    const { data, error } = await supabase
        .from('tags')
        .select(`
            tag,
            stack(user_id, project_id)
        `)
        .eq('stack.user_id', user.id)
        .eq('stack.project_id', projectId);

    if (error) {
        throw error;
    }

    return data
}

export async function insertStack(supabase, projectId, title, description, complexity,
    usersAffected, retention, conversion, confidence, selectedTags) {
    const { data, error } = await supabase
        .from(STACK_TABLE)
        .insert({
            project_id: projectId,
            title: title,
            description: description,
            complexity: complexity,
            users_affected: usersAffected,
            retention: retention,
            conversion: conversion,
            confidence: confidence,
            status: 0
        })
        .select()

    if (error) {
        throw error;
    }

    const tagsToInsert = selectedTags.map(tagName => ({
        tag: tagName,
        id: data[0].id
    }));

    const { tagData, tagError } = await supabase
        .from('tags')
        .upsert(tagsToInsert, {
            // Handle duplicates if you have a UNIQUE constraint on (task_id, tag)
            onConflict: 'id,tag', // Specify the columns forming the UNIQUE constraint
            ignoreDuplicates: true  // Tells Supabase to just ignore inserts if a matching row already exists
        })
        .select('*')

    if (tagError) {
        return false;
    }
    return true;
}

export async function insertRail(supabase, title, projectId) {
    const { data, error } = await supabase
        .from(RAIL_TABLE)
        .insert({
            title: title,
            project_id: projectId,
        })
        .select()

    if (error) {
        throw error;
    }

    return data;
}

export async function selectProjectRails(supabase, projectId) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from(RAIL_TABLE)
        .select("*")
        .eq('user_id', user.id)
        .eq('project_id', projectId)

    if (error) {
        throw error;
    }

    return data
}

export async function selectRailBy(supabase, projectId, column, value) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from(RAIL_TABLE)
        .select("*")
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq(column, value);

    if (error) {
        throw error;
    }

    return data
}

export async function deleteRail(supabase, railId) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from(RAIL_TABLE)
        .delete()
        .eq('user_id', user.id)
        .eq('id', railId)

    if (error) {
        throw error;
    }

    return data;
}