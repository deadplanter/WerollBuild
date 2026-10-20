import React, { useState } from 'react';
import { X, Lock, Shield, KeyRound, AlertCircle } from 'lucide-react';

interface PasswordPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  expectedPassword?: string;
  isSettingPassword?: boolean;
  onSuccess: (newPassword?: string) => void;
}

export const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  expectedPassword = '',
  isSettingPassword = false,
  onSuccess,
}) => {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSettingPassword) {
      if (password && password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      onSuccess(password.trim());
      onClose();
    } else {
      if (password === expectedPassword) {
        onSuccess();
        onClose();
      } else {
        setError('Contraseña incorrecta. Inténtalo de nuevo.');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-[#181920] border-2 border-amber-900/70 rounded-2xl p-6 text-stone-200 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            <h3 className="font-cinzel font-bold text-base text-amber-300">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-100 rounded hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-stone-400 mb-4 leading-relaxed">{description}</p>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-950/80 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
              {isSettingPassword ? 'Nueva Contraseña' : 'Ingresa la Contraseña'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-lg px-3 py-2 text-stone-100 text-sm font-mono"
            />
          </div>

          {isSettingPassword && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-lg px-3 py-2 text-stone-100 text-sm font-mono"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs rounded-lg shadow"
            >
              {isSettingPassword ? 'Guardar Contraseña' : 'Desbloquear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
