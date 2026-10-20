import React, { useState } from 'react';
import { MessageSquarePlus, Bug, Lightbulb, HelpCircle, X, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { AuthSessionUser } from '../auth/RoleSelectionModal';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser?: AuthSessionUser | null;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  authUser,
}) => {
  const [category, setCategory] = useState<'bug' | 'suggestion' | 'other'>('suggestion');
  const [description, setDescription] = useState<string>('');
  const [email, setEmail] = useState<string>(authUser?.email || '');
  const [name, setName] = useState<string>(authUser?.displayName || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!description.trim()) {
      setErrorMsg('Por favor escribe la descripción de tu feedback o reporte.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description: description.trim(),
          userEmail: email.trim() || authUser?.email,
          userName: name.trim() || authUser?.displayName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Error al enviar el feedback.');
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setDescription('');
          onClose();
        }, 2500);
      }
    } catch (err) {
      setErrorMsg('No se pudo conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-[#181920] border-2 border-amber-900/80 rounded-3xl shadow-2xl p-6 sm:p-7 text-stone-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-950 border border-amber-500/80 flex items-center justify-center text-amber-200 shadow-md">
              <MessageSquarePlus className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-lg text-amber-300">
                Buzón de Feedback WeRoll
              </h3>
              <p className="text-xs text-stone-400">
                Tu opinión nos ayuda a forjar la mejor suite de D&D 5E
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-emerald-950/80 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h4 className="font-cinzel font-bold text-xl text-emerald-300">
              ¡Muchas Gracias por tu Feedback!
            </h4>
            <p className="text-xs text-stone-300 max-w-sm">
              Tu mensaje ha sido guardado exitosamente en el panel del Administrador. Lo revisaremos para seguir mejorando las mesas y la plataforma.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Category Selector Tabs */}
            <div>
              <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1.5">
                Tipo de Mensaje
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCategory('bug')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    category === 'bug'
                      ? 'bg-red-950/80 border-red-500 text-red-200 shadow-md ring-1 ring-red-500'
                      : 'bg-[#121316] border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Bug className="w-4 h-4 text-red-400" />
                  <span className="font-cinzel font-bold text-xs">Bug / Error</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('suggestion')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    category === 'suggestion'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500'
                      : 'bg-[#121316] border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Lightbulb className="w-4 h-4 text-emerald-400" />
                  <span className="font-cinzel font-bold text-xs">Sugerencia</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('other')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    category === 'other'
                      ? 'bg-blue-950/80 border-blue-500 text-blue-200 shadow-md ring-1 ring-blue-500'
                      : 'bg-[#121316] border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-blue-400" />
                  <span className="font-cinzel font-bold text-xs">Otro Asunto</span>
                </button>
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                Descripción del Feedback
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  category === 'bug'
                    ? 'Explica qué ocurrió, qué estabas haciendo y qué esperabas ver...'
                    : category === 'suggestion'
                    ? 'Cuéntanos qué función o mejora te gustaría tener en WeRoll...'
                    : 'Escribe aquí tu duda, comentario o consulta...'
                }
                required
                className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-2xl p-3.5 text-stone-100 text-xs outline-none resize-none transition leading-relaxed"
              />
            </div>

            {/* User Identification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-cinzel font-semibold text-stone-400 mb-1">
                  Tu Correo (Opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aventurero@weroll.app"
                  className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-200 text-xs outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-cinzel font-semibold text-stone-400 mb-1">
                  Tu Nombre / Apodo (Opcional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sir Gareth"
                  className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-200 text-xs outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-stone-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-cinzel text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
