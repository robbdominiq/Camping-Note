// src/App.jsx
import { useEffect, useState } from 'react';
import supabase from './supabaseClient';

function App() {
    const [session, setSession] = useState(null);

    // Auth UI state
    const [email, setEmail] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    // Tasks state
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');

    // --- Auth lifecycle ---
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // When session changes, load tasks
    useEffect(() => {
        if (session?.user?.id) {
            fetchTasks(session.user.id);
        } else {
            setTasks([]);
        }
    }, [session]);

    // --- Auth actions ---
    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    };

    const signInWithFacebook = async () => {
        await supabase.auth.signInWithOAuth({ provider: 'facebook' });
    };

    const signInWithEmail = async () => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) {
            console.error('Error sending magic link:', error.message);
        } else {
            setOtpSent(true);
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Sign-out error:', error.message);
    };

    // --- CRUD actions ---
    const fetchTasks = async (userId) => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) console.error('Fetch tasks error:', error);
        else setTasks(data || []);
    };

    const addTask = async () => {
        if (!newTask.trim()) return;
        const userId = session?.user?.id;
        if (!userId) return;

        const { data, error } = await supabase
            .from('tasks')
            .insert([{ title: newTask.trim(), user_id: userId }])
            .select()
            .single();

        if (error) {
            console.error('Add task error:', error);
        } else if (data) {
            setTasks((prev) => [data, ...prev]);
            setNewTask('');
        }
    };

    const toggleTask = async (id, isCompleted) => {
        const { error } = await supabase
            .from('tasks')
            .update({ is_completed: !isCompleted })
            .eq('id', id);

        if (error) {
            console.error('Toggle task error:', error);
        } else {
            setTasks((prev) =>
                prev.map((t) =>
                    t.id === id ? { ...t, is_completed: !isCompleted } : t
                )
            );
        }
    };

    const deleteTask = async (id) => {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) {
            console.error('Delete task error:', error);
        } else {
            setTasks((prev) => prev.filter((t) => t.id !== id));
        }
    };

    // --- UI ---
    if (!session) {
        return (
            <div className='flex flex-col gap-6 items-center mt-10'>
                {/* Google Login */}
                <button
                    onClick={signInWithGoogle}
                    className='btn btn-primary w-60'
                >
                    Sign in with Google
                </button>

                {/* Facebook Login */}
                <button
                    onClick={signInWithFacebook}
                    className='btn btn-accent w-60'
                >
                    Sign in with Facebook
                </button>

                {/* Email Magic Link */}
                <div className='flex flex-col gap-2 w-60'>
                    <input
                        type='email'
                        placeholder='Enter email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className='input input-bordered'
                    />
                    <button
                        onClick={signInWithEmail}
                        className='btn btn-secondary'
                    >
                        Email me a Login Link
                    </button>
                    <p className='text-sm text-gray-500'>
                        We’ll send a one-time secure link to your email. Click
                        it to sign in — no password needed.
                    </p>
                    {otpSent && (
                        <p className='text-green-600'>✅ Check your inbox!</p>
                    )}
                </div>
            </div>
        );
    }

    // Logged-in view
    return (
        <div className='text-center'>
            <h1 className='text-4xl py-4 bg-amber-900 text-white'>My Tasks</h1>

            {/* User info */}
            <div className='mt-4'>
                <img
                    src={session?.user?.user_metadata?.avatar_url}
                    alt='profile'
                    className='w-16 h-16 rounded-full mx-auto'
                />
                <p>
                    {session?.user?.user_metadata?.full_name ||
                        session?.user?.email}
                </p>
                <button onClick={signOut} className='btn btn-error mt-2'>
                    Sign out
                </button>
            </div>

            {/* Add task */}
            <div className='mt-6 flex justify-center gap-2 px-4'>
                <input
                    type='text'
                    placeholder='New task...'
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    className='input input-bordered w-full max-w-xl'
                />
                <button
                    onClick={addTask}
                    disabled={!newTask.trim()}
                    className='btn btn-success'
                >
                    Add
                </button>
            </div>

            {/* Task list */}
            <ul className='mt-6 space-y-2 w-full max-w-2xl mx-auto px-4'>
                {tasks.map((task) => (
                    <li
                        key={task.id}
                        className='flex justify-between items-center bg-emerald-100 p-3 rounded'
                    >
                        <span
                            className={
                                task.is_completed
                                    ? 'line-through text-gray-500'
                                    : ''
                            }
                        >
                            {task.title}
                        </span>
                        <div className='flex gap-2'>
                            <button
                                onClick={() =>
                                    toggleTask(task.id, task.is_completed)
                                }
                                className='btn btn-sm btn-info'
                            >
                                {task.is_completed ? 'Undo' : 'Complete'}
                            </button>
                            <button
                                onClick={() => deleteTask(task.id)}
                                className='btn btn-sm btn-error'
                            >
                                Delete
                            </button>
                        </div>
                    </li>
                ))}
                {tasks.length === 0 && (
                    <li className='text-gray-500'>
                        No tasks yet — add your first one!
                    </li>
                )}
            </ul>
        </div>
    );
}

export default App;
