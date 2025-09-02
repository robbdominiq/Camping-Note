// src/App.jsx
import { useEffect, useState } from 'react';
import supabase from './supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    CheckCircle2,
    Circle,
    Trash2,
    Plus,
    LogOut,
    Mail,
    Loader2,
} from 'lucide-react';

function App() {
    const [session, setSession] = useState(null);

    // Auth UI state
    const [email, setEmail] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    // Tasks state
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');

    // Loading states
    const [isInitializing, setIsInitializing] = useState(true);
    const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
    const [isSigningInFacebook, setIsSigningInFacebook] = useState(false);
    const [isSigningInEmail, setIsSigningInEmail] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [togglingTaskId, setTogglingTaskId] = useState(null);
    const [deletingTaskId, setDeletingTaskId] = useState(null);

    // ========================================
    // AUTH LIFECYCLE
    // ========================================

    useEffect(() => {
        setIsInitializing(true);
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsInitializing(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setIsInitializing(false);
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

    // ========================================
    // AUTH ACTIONS
    // ========================================

    const signInWithGoogle = async () => {
        setIsSigningInGoogle(true);
        try {
            await supabase.auth.signInWithOAuth({ provider: 'google' });
        } finally {
            setIsSigningInGoogle(false);
        }
    };

    const signInWithFacebook = async () => {
        setIsSigningInFacebook(true);
        try {
            await supabase.auth.signInWithOAuth({ provider: 'facebook' });
        } finally {
            setIsSigningInFacebook(false);
        }
    };

    const signInWithEmail = async () => {
        setIsSigningInEmail(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({ email });

            if (error) {
                console.error('Error sending magic link:', error.message);
            } else {
                setOtpSent(true);
            }
        } finally {
            setIsSigningInEmail(false);
        }
    };

    const signOut = async () => {
        setIsSigningOut(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) console.error('Sign-out error:', error.message);
        } finally {
            setIsSigningOut(false);
        }
    };

    // ========================================
    // CRUD ACTIONS
    // ========================================

    const fetchTasks = async (userId) => {
        setIsLoadingTasks(true);
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Fetch tasks error:', error);
            } else {
                setTasks(data || []);
            }
        } finally {
            setIsLoadingTasks(false);
        }
    };

    const addTask = async () => {
        if (!newTask.trim()) return;

        const userId = session?.user?.id;
        if (!userId) return;

        setIsAddingTask(true);
        try {
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
        } finally {
            setIsAddingTask(false);
        }
    };

    const toggleTask = async (id, isCompleted) => {
        setTogglingTaskId(id);
        try {
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
        } finally {
            setTogglingTaskId(null);
        }
    };

    const deleteTask = async (id) => {
        setDeletingTaskId(id);
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Delete task error:', error);
            } else {
                setTasks((prev) => prev.filter((t) => t.id !== id));
            }
        } finally {
            setDeletingTaskId(null);
        }
    };

    // Show loading screen during initialization
    if (isInitializing) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center'>
                <div className='flex flex-col items-center space-y-4'>
                    <Loader2 className='h-8 w-8 animate-spin text-slate-600' />
                    <p className='text-slate-600'>Loading...</p>
                </div>
            </div>
        );
    }

    // ========================================
    // RENDER: UNAUTHENTICATED STATE
    // ========================================

    if (!session) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4'>
                <Card className='w-full max-w-md shadow-2xl border-0'>
                    <CardHeader className='space-y-1 text-center'>
                        <CardTitle className='text-2xl font-bold'>
                            Welcome to{' '}
                            <span className='text-orange-700'>
                                Camping Notes
                            </span>
                        </CardTitle>
                        <CardDescription>
                            Sign in to your account to manage your tasks
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                        {/* OAuth Buttons */}
                        <div>
                            <Button
                                onClick={signInWithGoogle}
                                disabled={isSigningInGoogle}
                                className='w-full border-0 bg-slate-500 text-white cursor-pointer'
                                variant='outline'
                            >
                                {isSigningInGoogle ? (
                                    <>
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            className='mr-2 h-4 w-4'
                                            viewBox='0 0 24 24'
                                        >
                                            <path
                                                fill='currentColor'
                                                d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                                            />
                                            <path
                                                fill='currentColor'
                                                d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                                            />
                                            <path
                                                fill='currentColor'
                                                d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                                            />
                                            <path
                                                fill='currentColor'
                                                d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                                            />
                                        </svg>
                                        Continue with Google
                                    </>
                                )}
                            </Button>
                        </div>

                        <div>
                            <Button
                                onClick={signInWithFacebook}
                                disabled={isSigningInFacebook}
                                className='w-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                            >
                                {isSigningInFacebook ? (
                                    <>
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            className='mr-2 h-4 w-4'
                                            fill='currentColor'
                                            viewBox='0 0 24 24'
                                        >
                                            <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
                                        </svg>
                                        Continue with Facebook
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className='relative my-7'>
                            <div className='absolute inset-0 flex items-center'>
                                <Separator />
                            </div>
                            <div className='relative flex justify-center text-xs uppercase'>
                                <span className='bg-background px-2 text-muted-foreground font-bold'>
                                    Or continue with email
                                </span>
                            </div>
                        </div>

                        {/* Email Magic Link */}
                        <div className='space-y-2'>
                            <div>
                                <Input
                                    type='email'
                                    placeholder='Enter your email address'
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isSigningInEmail}
                                />
                            </div>
                            <div>
                                <Button
                                    onClick={signInWithEmail}
                                    disabled={isSigningInEmail}
                                    className='w-full bg-gray-900 text-blue-50 cursor-pointer'
                                >
                                    {isSigningInEmail ? (
                                        <>
                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className='mr-2 h-4 w-4' />
                                            Send Magic Link
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className='text-xs text-muted-foreground text-center my-5'>
                                We'll send a secure link to your email. No
                                password required.
                            </p>
                            {otpSent && (
                                <div className='text-center'>
                                    <Badge className='text-green-700 bg-green-50'>
                                        Check your inbox!
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ========================================
    // RENDER: AUTHENTICATED STATE
    // ========================================

    const completedCount = tasks.filter((task) => task.is_completed).length;
    const totalCount = tasks.length;

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100'>
            {/* Header */}
            <div className='bg-white/80 backdrop-blur-sm border-b shadow-sm'>
                <div className='max-w-4xl mx-auto px-4 py-4'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-4'>
                            <Avatar>
                                <AvatarImage
                                    src={
                                        session?.user?.user_metadata?.avatar_url
                                    }
                                />
                                <AvatarFallback>
                                    {(
                                        session?.user?.user_metadata
                                            ?.full_name ||
                                        session?.user?.email ||
                                        'U'
                                    )
                                        .charAt(0)
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className='text-xl font-semibold'>
                                    {session?.user?.user_metadata?.full_name ||
                                        'My Tasks'}
                                </h1>
                                <p className='text-sm text-muted-foreground'>
                                    {session?.user?.email}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={signOut}
                            variant='outline'
                            size='sm'
                            disabled={isSigningOut}
                        >
                            {isSigningOut ? (
                                <>
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    Signing out...
                                </>
                            ) : (
                                <>
                                    <LogOut className='mr-2 h-4 w-4' />
                                    Sign out
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className='max-w-4xl mx-auto px-4 py-8'>
                {/* Stats Cards */}
                <div className='grid grid-cols-2 md:grid-cols-3 gap-4 mb-8'>
                    <Card>
                        <CardContent className='p-4 text-center'>
                            <div className='text-2xl font-bold text-blue-600'>
                                {isLoadingTasks ? (
                                    <Loader2 className='h-6 w-6 animate-spin mx-auto' />
                                ) : (
                                    totalCount
                                )}
                            </div>
                            <p className='text-sm text-muted-foreground'>
                                Total Tasks
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className='p-4 text-center'>
                            <div className='text-2xl font-bold text-green-600'>
                                {isLoadingTasks ? (
                                    <Loader2 className='h-6 w-6 animate-spin mx-auto' />
                                ) : (
                                    completedCount
                                )}
                            </div>
                            <p className='text-sm text-muted-foreground'>
                                Completed
                            </p>
                        </CardContent>
                    </Card>
                    <Card className='col-span-2 md:col-span-1'>
                        <CardContent className='p-4 text-center'>
                            <div className='text-2xl font-bold text-orange-600'>
                                {isLoadingTasks ? (
                                    <Loader2 className='h-6 w-6 animate-spin mx-auto' />
                                ) : (
                                    totalCount - completedCount
                                )}
                            </div>
                            <p className='text-sm text-muted-foreground'>
                                Remaining
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Add Task */}
                <Card className='mb-6'>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'>
                            <Plus className='h-5 w-5' />
                            Add New Task
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='flex gap-2'>
                            <Input
                                placeholder='What needs to be done?'
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                onKeyPress={(e) =>
                                    e.key === 'Enter' &&
                                    !isAddingTask &&
                                    addTask()
                                }
                                disabled={isAddingTask}
                                className='flex-1'
                            />
                            <Button
                                onClick={addTask}
                                disabled={!newTask.trim() || isAddingTask}
                                className='shrink-0'
                            >
                                {isAddingTask ? (
                                    <>
                                        <Loader2 className='h-4 w-4 animate-spin' />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus className='h-4 w-4' />
                                        Add Task
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Tasks List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your Tasks</CardTitle>
                        <CardDescription>
                            {totalCount === 0
                                ? 'No tasks yet. Add your first task above!'
                                : `${completedCount} of ${totalCount} tasks completed`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingTasks ? (
                            <div className='text-center py-8 text-muted-foreground'>
                                <Loader2 className='mx-auto h-8 w-8 animate-spin mb-4' />
                                <p>Loading your tasks...</p>
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className='text-center py-8 text-muted-foreground'>
                                <Circle className='mx-auto h-12 w-12 mb-4 opacity-50' />
                                <p>No tasks yet — add your first one above!</p>
                            </div>
                        ) : (
                            <div className='space-y-2'>
                                {tasks.map((task, index) => (
                                    <div key={task.id}>
                                        <div className='flex items-center justify-between p-3 rounded-lg bg-slate-50/50 hover:bg-slate-100/50 transition-colors'>
                                            <div className='flex items-center space-x-3 flex-1'>
                                                <Button
                                                    onClick={() =>
                                                        toggleTask(
                                                            task.id,
                                                            task.is_completed
                                                        )
                                                    }
                                                    variant='ghost'
                                                    size='sm'
                                                    className='p-1 h-auto'
                                                    disabled={
                                                        togglingTaskId ===
                                                        task.id
                                                    }
                                                >
                                                    {togglingTaskId ===
                                                    task.id ? (
                                                        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                                                    ) : task.is_completed ? (
                                                        <CheckCircle2 className='h-5 w-5 text-green-600' />
                                                    ) : (
                                                        <Circle className='h-5 w-5 text-muted-foreground' />
                                                    )}
                                                </Button>
                                                <span
                                                    className={`flex-1 ${
                                                        task.is_completed
                                                            ? 'line-through text-muted-foreground'
                                                            : 'text-foreground'
                                                    }`}
                                                >
                                                    {task.title}
                                                </span>
                                                {task.is_completed && (
                                                    <Badge
                                                        variant='secondary'
                                                        className='text-xs'
                                                    >
                                                        Done
                                                    </Badge>
                                                )}
                                            </div>
                                            <Button
                                                onClick={() =>
                                                    deleteTask(task.id)
                                                }
                                                variant='ghost'
                                                size='sm'
                                                className='text-red-500 hover:text-red-700 hover:bg-red-50'
                                                disabled={
                                                    deletingTaskId === task.id
                                                }
                                            >
                                                {deletingTaskId === task.id ? (
                                                    <Loader2 className='h-4 w-4 animate-spin' />
                                                ) : (
                                                    <Trash2 className='h-4 w-4' />
                                                )}
                                            </Button>
                                        </div>
                                        {index < tasks.length - 1 && (
                                            <Separator className='my-1' />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default App;
