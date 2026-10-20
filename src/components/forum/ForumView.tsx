import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  Plus,
  ArrowUp,
  Share2,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Pin,
  Lock,
  User,
  Shield,
  Crown,
  ChevronRight,
  Send,
  X,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ForumPost, ForumComment, ForumCategory, ForumFlair, PlayerType, AppRole } from '../../types/dnd';
import { AuthSessionUser } from '../auth/RoleSelectionModal';

interface ForumViewProps {
  authUser: AuthSessionUser | null;
  onOpenLoginModal?: () => void;
  onOpenModeratorPanel?: () => void;
}

export const ForumView: React.FC<ForumViewProps> = ({
  authUser,
  onOpenLoginModal,
  onOpenModeratorPanel,
}) => {
  // Primary Tabs
  const [activeCategory, setActiveCategory] = useState<ForumCategory>('community');
  // Community Filter: 'all' | 'dm' | 'player'
  const [roleFilter, setRoleFilter] = useState<'all' | 'dm' | 'player'>('all');
  const [selectedFlair, setSelectedFlair] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Posts State
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Selected Post for detailed thread
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activePost, setActivePost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

  // Create Post Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newPostTitle, setNewPostTitle] = useState<string>('');
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [newPostCategory, setNewPostCategory] = useState<ForumCategory>('community');
  const [newPostFlair, setNewPostFlair] = useState<ForumFlair>('Duda');
  const [isCreatingPost, setIsCreatingPost] = useState<boolean>(false);
  const [createPostError, setCreatePostError] = useState<string>('');

  // Permission Request Notice State
  const [isPermNoticeOpen, setIsPermNoticeOpen] = useState<boolean>(false);
  const [permRequestSent, setPermRequestSent] = useState<boolean>(false);

  const isAdmin = authUser?.appRole === 'admin' || (authUser?.role as string) === 'admin';

  const isPrivileged =
    isAdmin ||
    authUser?.appRole === 'moderator' ||
    (authUser?.role as string) === 'moderator';

  const canPost = isPrivileged || Boolean(authUser?.canPostInForum);

  // Fetch posts
  const fetchPosts = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (activeCategory) params.append('category', activeCategory);
      if (roleFilter !== 'all') params.append('roleFilter', roleFilter);
      if (searchQuery.trim()) params.append('q', searchQuery.trim());

      const res = await fetch(`/api/forum/posts?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar publicaciones');
      setPosts(data.posts || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeCategory, roleFilter, searchQuery]);

  // Load detailed post & comments
  const loadPostDetails = async (postId: string) => {
    setActivePostId(postId);
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}`);
      const data = await res.json();
      if (res.ok && data.post) {
        setActivePost(data.post);
        setComments(data.comments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Upvote Post
  const handleUpvotePost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!authUser?.email) {
      if (onOpenLoginModal) onOpenLoginModal();
      return;
    }
    try {
      const res = await fetch(`/api/forum/posts/${postId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: authUser.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  upvotes: data.upvotes,
                  upvoters: data.userUpvoted
                    ? [...(p.upvoters || []), authUser.email]
                    : (p.upvoters || []).filter((em) => em !== authUser.email),
                }
              : p
          )
        );
        if (activePost && activePost.id === postId) {
          setActivePost((prev) =>
            prev ? { ...prev, upvotes: data.upvotes } : null
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit New Post
  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) {
      if (onOpenLoginModal) onOpenLoginModal();
      return;
    }
    if (!canPost) {
      setIsCreateModalOpen(false);
      setIsPermNoticeOpen(true);
      return;
    }
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      setCreatePostError('Por favor ingresa un título y contenido para la publicación.');
      return;
    }

    setIsCreatingPost(true);
    setCreatePostError('');
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newPostCategory,
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
          authorEmail: authUser.email,
          authorName: authUser.displayName,
          authorTagId: authUser.userTagId || '123',
          authorPlayerType: authUser.playerType || (authUser.role === 'dm' ? 'dm' : 'player'),
          authorAppRole: authUser.appRole || 'client',
          flair: newPostFlair,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al publicar.');

      setIsCreateModalOpen(false);
      setNewPostTitle('');
      setNewPostContent('');
      fetchPosts();
    } catch (err: any) {
      setCreatePostError(err.message || 'Error al crear la publicación.');
    } finally {
      setIsCreatingPost(false);
    }
  };

  // Submit Comment
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePostId || !newCommentText.trim()) return;
    if (!authUser) {
      if (onOpenLoginModal) onOpenLoginModal();
      return;
    }
    if (!canPost) {
      setIsPermNoticeOpen(true);
      return;
    }

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/forum/posts/${activePostId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newCommentText.trim(),
          authorEmail: authUser.email,
          authorName: authUser.displayName,
          authorTagId: authUser.userTagId || '123',
          authorPlayerType: authUser.playerType || (authUser.role === 'dm' ? 'dm' : 'player'),
          authorAppRole: authUser.appRole || 'client',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar respuesta.');

      setComments((prev) => [...prev, data.comment]);
      setNewCommentText('');
      // Update post comments count locally
      setPosts((prev) =>
        prev.map((p) =>
          p.id === activePostId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
        )
      );
    } catch (err: any) {
      alert(err.message || 'Error al comentar.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete Post (Author or Moderator/Admin)
  const handleDeletePost = async (postId: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta publicación del foro?')) return;
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        if (activePostId === postId) {
          setActivePostId(null);
          setActivePost(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Request Posting Permission
  const handleRequestPermission = async () => {
    if (!authUser) return;
    try {
      const res = await fetch('/api/auth/request-forum-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, email: authUser.email }),
      });
      if (res.ok) {
        setPermRequestSent(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter by flair
  const filteredPosts = posts.filter((p) => {
    if (selectedFlair === 'all') return true;
    return p.flair === selectedFlair;
  });

  return (
    <div className="bg-[#14151b] border border-stone-800/80 rounded-2xl p-5 shadow-2xl flex flex-col h-full min-h-[640px]">
      {/* =================================================================== */}
      {/* FORUM HEADER & PRIMARY TABS                                         */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-cinzel font-black text-lg text-amber-200 tracking-wide flex items-center gap-2">
                <span>Foro WeRoll</span>
                <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-700/50 text-amber-300">
                  Comunidad & Novedades
                </span>
              </h2>
              <p className="text-xs text-stone-400 font-sans">
                Entérate de las últimas actualizaciones, haz preguntas de reglas e interactúa con otros DMs y aventureros.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Nueva Publicación */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!authUser) {
                if (onOpenLoginModal) onOpenLoginModal();
                return;
              }
              if (!canPost) {
                setIsPermNoticeOpen(true);
                return;
              }
              setIsCreateModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-cinzel font-bold text-xs transition shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Publicación</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* CATEGORY SELECTOR PILLS                                             */}
      {/* =================================================================== */}
      <div className="flex flex-wrap items-center gap-2 pt-4 pb-3">
        <button
          onClick={() => {
            setActiveCategory('community');
            setActivePostId(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-cinzel font-bold transition flex items-center gap-2 border ${
            activeCategory === 'community'
              ? 'bg-amber-950/60 border-amber-600 text-amber-200 shadow-sm'
              : 'bg-[#181920] border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
          }`}
        >
          <span>🛡️ Foro Comunitario</span>
        </button>

        <button
          onClick={() => {
            setActiveCategory('app-updates');
            setActivePostId(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-cinzel font-bold transition flex items-center gap-2 border ${
            activeCategory === 'app-updates'
              ? 'bg-amber-950/60 border-amber-600 text-amber-200 shadow-sm'
              : 'bg-[#181920] border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
          }`}
        >
          <span>📢 Actualizaciones de la App</span>
        </button>

        <button
          onClick={() => {
            setActiveCategory('general');
            setActivePostId(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-cinzel font-bold transition flex items-center gap-2 border ${
            activeCategory === 'general'
              ? 'bg-amber-950/60 border-amber-600 text-amber-200 shadow-sm'
              : 'bg-[#181920] border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
          }`}
        >
          <span>💬 Foro General</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* COMMUNITY FILTERS & SEARCH BAR (REDDIT STYLE)                        */}
      {/* =================================================================== */}
      {activeCategory === 'community' && (
        <div className="bg-[#181920] border border-stone-800/80 rounded-xl p-3 mb-4 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Sub-Filter: All, Only DMs, Only Players */}
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <span className="text-[11px] font-cinzel font-bold text-stone-400 mr-1 hidden sm:inline">Ver:</span>
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                roleFilter === 'all'
                  ? 'bg-stone-700 text-amber-300 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Todos los mensajes
            </button>
            <button
              onClick={() => setRoleFilter('dm')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                roleFilter === 'dm'
                  ? 'bg-amber-900/60 text-amber-300 font-bold border border-amber-700/60'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>👑 Solo DMs</span>
            </button>
            <button
              onClick={() => setRoleFilter('player')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                roleFilter === 'player'
                  ? 'bg-sky-950/60 text-sky-300 font-bold border border-sky-700/60'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>🗡️ Solo Jugadores</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por tema, regla o autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121318] border border-stone-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* CONTENT: SPLIT OR THREAD VIEW                                       */}
      {/* =================================================================== */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-400">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mb-2" />
            <p className="text-xs font-cinzel">Cargando publicaciones del foro...</p>
          </div>
        ) : errorMsg ? (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-xs text-red-300 text-center">
            {errorMsg}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-[#181920]/40 border border-dashed border-stone-800 rounded-2xl p-6">
            <MessageSquare className="w-10 h-10 text-stone-600 mx-auto mb-3" />
            <h4 className="font-cinzel font-bold text-sm text-stone-300 mb-1">
              No hay publicaciones en esta sección
            </h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
              {searchQuery
                ? 'No se encontraron resultados para tu búsqueda. Prueba con otros términos.'
                : 'Sé el primero en iniciar una conversación, compartir una duda de reglas o contar una hazaña de tu mesa.'}
            </p>
            <button
              onClick={() => {
                if (!authUser) {
                  if (onOpenLoginModal) onOpenLoginModal();
                } else if (!canPost) {
                  setIsPermNoticeOpen(true);
                } else {
                  setIsCreateModalOpen(true);
                }
              }}
              className="px-4 py-2 rounded-xl bg-amber-900/40 hover:bg-amber-900/60 border border-amber-700/60 text-amber-200 text-xs font-cinzel font-bold transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publicar Ahora</span>
            </button>
          </div>
        ) : activePostId && activePost ? (
          // =================================================================
          // SINGLE POST DISCUSSION THREAD (REDDIT STYLE)
          // =================================================================
          <div className="space-y-4">
            <button
              onClick={() => {
                setActivePostId(null);
                setActivePost(null);
              }}
              className="text-xs text-amber-400 hover:text-amber-300 font-cinzel font-bold flex items-center gap-1 py-1"
            >
              <span>← Volver a la lista de temas</span>
            </button>

            {/* Main Post Card */}
            <div className="bg-[#181920] border border-stone-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-start gap-4">
                {/* Reddit-style Upvote column */}
                <div className="flex flex-col items-center shrink-0 bg-[#121318] p-1.5 rounded-xl border border-stone-800">
                  <button
                    onClick={(e) => handleUpvotePost(e, activePost.id)}
                    className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-400 transition"
                    title="Votar positivamente"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <span className="font-cinzel font-bold text-xs text-amber-300 my-0.5">
                    {activePost.upvotes || 0}
                  </span>
                </div>

                {/* Post Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {activePost.flair && (
                      <span className="text-[10px] font-cinzel font-bold px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-300">
                        {activePost.flair}
                      </span>
                    )}
                    <span className="text-xs text-stone-400">
                      Publicado por{' '}
                      <strong className="text-stone-200 font-semibold">{activePost.authorFullTag}</strong>
                    </span>
                    <span className="text-[10px] text-stone-500">
                      • {new Date(activePost.createdAt).toLocaleDateString()} {new Date(activePost.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {activePost.authorAppRole === 'admin' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950/80 border border-red-700/60 text-red-300 font-bold">
                        ADMIN
                      </span>
                    )}
                    {activePost.authorAppRole === 'moderator' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-700/60 text-purple-300 font-bold">
                        MOD
                      </span>
                    )}
                  </div>

                  <h3 className="font-cinzel font-black text-base text-stone-100 mb-3 leading-snug">
                    {activePost.title}
                  </h3>

                  <div className="text-xs text-stone-300 font-sans leading-relaxed whitespace-pre-line mb-4 bg-[#121318]/50 p-3.5 rounded-xl border border-stone-800/80">
                    {activePost.content}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-800/60">
                    <span className="flex items-center gap-1 font-sans text-stone-400">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                      <span>{comments.length} comentarios</span>
                    </span>

                    {(authUser?.email === activePost.authorEmail || isPrivileged) && (
                      <button
                        onClick={() => handleDeletePost(activePost.id)}
                        className="text-red-400 hover:text-red-300 font-sans text-xs flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar tema</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Comment Reply Form */}
            <div className="bg-[#181920] border border-stone-800 rounded-xl p-4">
              <h4 className="font-cinzel font-bold text-xs text-stone-300 mb-2 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>Responder a este tema</span>
              </h4>

              {!canPost ? (
                <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-200 flex items-center justify-between gap-3">
                  <span>Para responder en los foros se requiere aprobación de un moderador o admin.</span>
                  <button
                    onClick={handleRequestPermission}
                    disabled={permRequestSent}
                    className="px-2.5 py-1 rounded-lg bg-amber-800 hover:bg-amber-700 text-stone-100 font-bold text-[11px] shrink-0 transition"
                  >
                    {permRequestSent ? 'Solicitud Enviada' : 'Pedir Permiso'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCommentSubmit} className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Escribe tu opinión, aclaración de reglas o experiencia..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full bg-[#121318] border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-600 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !newCommentText.trim()}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-cinzel font-bold text-xs transition flex items-center gap-1.5"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isSubmittingComment ? 'Enviando...' : 'Comentar'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Comments List */}
            <div className="space-y-2.5 pt-2">
              <h4 className="font-cinzel font-bold text-xs text-stone-400 uppercase tracking-wider">
                Respuestas de la comunidad ({comments.length})
              </h4>

              {isLoadingComments ? (
                <div className="py-6 text-center text-xs text-stone-500">Cargando comentarios...</div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-stone-500 italic py-3 text-center">
                  Aún no hay respuestas. ¡Sé el primero en comentar!
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-[#16171e] border border-stone-800/80 rounded-xl p-3.5 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <strong className="text-xs text-amber-300 font-semibold">
                          {comment.authorFullTag}
                        </strong>
                        <span className="text-[10px] text-stone-500">
                          {new Date(comment.createdAt).toLocaleDateString()}{' '}
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {comment.authorAppRole === 'admin' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950/80 border border-red-700/60 text-red-300 font-bold">
                            ADMIN
                          </span>
                        )}
                        {comment.authorAppRole === 'moderator' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-700/60 text-purple-300 font-bold">
                            MOD
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-200 leading-relaxed whitespace-pre-line">
                        {comment.content}
                      </p>
                    </div>

                    {(authUser?.email === comment.authorEmail || isPrivileged) && (
                      <button
                        onClick={async () => {
                          if (confirm('¿Eliminar este comentario?')) {
                            await fetch(`/api/forum/comments/${comment.id}`, { method: 'DELETE' });
                            setComments((prev) => prev.filter((c) => c.id !== comment.id));
                          }
                        }}
                        className="text-stone-500 hover:text-red-400 p-1"
                        title="Eliminar comentario"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          // =================================================================
          // POSTS LIST (REDDIT STYLE CARDS)
          // =================================================================
          filteredPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => loadPostDetails(post.id)}
              className="bg-[#181920] hover:bg-[#1c1d25] border border-stone-800 hover:border-amber-700/60 rounded-2xl p-4 transition cursor-pointer shadow-md group"
            >
              <div className="flex items-start gap-3.5">
                {/* Reddit-style Upvotes block */}
                <div
                  onClick={(e) => handleUpvotePost(e, post.id)}
                  className="flex flex-col items-center justify-center bg-[#121318] hover:bg-stone-800/80 p-2 rounded-xl border border-stone-800 transition shrink-0 min-w-[42px]"
                  title="Voto positivo"
                >
                  <ArrowUp className="w-4 h-4 text-stone-400 group-hover:text-amber-400 transition" />
                  <span className="font-cinzel font-bold text-xs text-amber-300 mt-0.5">
                    {post.upvotes || 0}
                  </span>
                </div>

                {/* Post Summary */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {post.pinned && (
                      <span className="text-[10px] font-cinzel font-bold px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-600 text-amber-300 flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" />
                        <span>Fijado</span>
                      </span>
                    )}
                    {post.flair && (
                      <span className="text-[10px] font-cinzel font-bold px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-stone-300">
                        {post.flair}
                      </span>
                    )}
                    <span className="text-xs text-stone-400">
                      por <strong className="text-stone-300 font-semibold">{post.authorFullTag}</strong>
                    </span>
                    <span className="text-[10px] text-stone-500">
                      • {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    {post.authorPlayerType === 'dm' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-800 text-amber-400 font-bold">
                        DM
                      </span>
                    )}
                    {post.authorAppRole === 'admin' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950/80 border border-red-700/60 text-red-300 font-bold">
                        ADMIN
                      </span>
                    )}
                    {post.authorAppRole === 'moderator' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-700/60 text-purple-300 font-bold">
                        MOD
                      </span>
                    )}
                  </div>

                  <h3 className="font-cinzel font-bold text-sm text-stone-100 group-hover:text-amber-200 transition mb-1 leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed font-sans mb-3">
                    {post.content}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-stone-500 font-sans">
                    <span className="flex items-center gap-1 hover:text-amber-400 transition">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{post.commentsCount || 0} comentarios</span>
                    </span>

                    {(authUser?.email === post.authorEmail || isPrivileged) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePost(post.id);
                        }}
                        className="text-stone-500 hover:text-red-400 flex items-center gap-1 transition ml-auto"
                        title="Eliminar publicación"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL: CREATE NEW POST                                              */}
      {/* =================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181920] border border-amber-800/80 rounded-2xl w-full max-w-xl p-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <h3 className="font-cinzel font-black text-base text-amber-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Crear Publicación en el Foro</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createPostError && (
              <div className="bg-red-950/60 border border-red-700 rounded-xl p-3 text-xs text-red-200 mb-4">
                {createPostError}
              </div>
            )}

            <form onSubmit={handleCreatePostSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-cinzel font-bold text-stone-300 mb-1">
                  Sección del Foro
                </label>
                <select
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value as ForumCategory)}
                  className="w-full bg-[#121318] border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-600"
                >
                  <option value="community">🛡️ Foro Comunitario (Dudas, consejos, historias)</option>
                  <option value="general">💬 Foro General</option>
                  {isAdmin && (
                    <option value="app-updates">📢 Actualizaciones de la App (Solo Admin)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-cinzel font-bold text-stone-300 mb-1">
                  Etiqueta / Flair
                </label>
                <select
                  value={newPostFlair}
                  onChange={(e) => setNewPostFlair(e.target.value as ForumFlair)}
                  className="w-full bg-[#121318] border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-600"
                >
                  <option value="Duda">❓ Duda</option>
                  <option value="Reglas 5E">📜 Reglas 5E</option>
                  <option value="Historia de Mesa">🐉 Historia de Mesa</option>
                  <option value="Guía DM">👑 Guía DM</option>
                  <option value="Búsqueda de Grupo">👥 Búsqueda de Grupo</option>
                  <option value="General">💬 General</option>
                  {isAdmin && <option value="Actualización">🚀 Actualización Oficial</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-cinzel font-bold text-stone-300 mb-1">
                  Título de la Publicación
                </label>
                <input
                  type="text"
                  placeholder="Ej. ¿Cómo resuelven el daño por caída en sus mesas?"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full bg-[#121318] border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-cinzel font-bold text-stone-300 mb-1">
                  Contenido del Mensaje
                </label>
                <textarea
                  rows={6}
                  placeholder="Explica tu duda o comparte tu experiencia detallada..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full bg-[#121318] border border-stone-800 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-cinzel font-bold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPost || !newPostTitle.trim() || !newPostContent.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-cinzel font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isCreatingPost ? 'Publicando...' : 'Publicar en Foro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: FORUM POSTING PERMISSION NOTICE                              */}
      {/* =================================================================== */}
      {isPermNoticeOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181920] border border-amber-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-600 flex items-center justify-center text-amber-400 mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel font-black text-base text-amber-200 mb-2">
              Permiso de Publicación Requerido
            </h3>
            <p className="text-xs text-stone-300 font-sans leading-relaxed mb-4">
              Por seguridad y para mantener la comunidad libre de spam, los jugadores clientes requieren autorización de un moderador o administrador para crear temas y responder en el foro.
            </p>

            {permRequestSent ? (
              <div className="bg-emerald-950/50 border border-emerald-700 rounded-xl p-3 text-xs text-emerald-300 mb-4 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Tu solicitud ha sido enviada al equipo de moderación!</span>
              </div>
            ) : (
              <button
                onClick={handleRequestPermission}
                className="w-full mb-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-cinzel font-bold text-xs transition shadow flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Solicitar Permiso al Moderador</span>
              </button>
            )}

            <button
              onClick={() => setIsPermNoticeOpen(false)}
              className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-cinzel font-bold text-xs transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
