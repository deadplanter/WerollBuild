import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, Wand2, Shield, RefreshCw } from 'lucide-react';
import { Character5e, DMWorkspace } from '../../types/dnd';

interface Message {
  id: string;
  sender: 'user' | 'oracle';
  text: string;
  isOffline?: boolean;
}

interface ArcaneOracleModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterContext?: Character5e;
  dmContext?: DMWorkspace;
  initialPrompt?: string;
  welcomeMessage?: string;
  customApiKey?: string;
  customModel?: string;
}

export const ArcaneOracleModal: React.FC<ArcaneOracleModalProps> = ({
  isOpen,
  onClose,
  characterContext,
  dmContext,
  initialPrompt,
  welcomeMessage,
  customApiKey,
  customModel,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'oracle',
      text:
        welcomeMessage ||
        'Saludos, viajero. Soy el Sabio Arcano, tu árbitro y oráculo de D&D 5E impulsado por Gemini Flash. Puedo consultar el manual de reglas, revisar el equipo de tu personaje o asesorar al Dungeon Master en su aventura. ¿Qué enigma deseas desentrañar?',
    },
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Set initial prompt if provided
  React.useEffect(() => {
    if (isOpen && initialPrompt) {
      setInputValue(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  if (!isOpen) return null;

  const quickPrompts = dmContext
    ? [
        '¿Qué secretos o ganchos dejé pendientes en mis NPCs y lugares?',
        '¿Cómo han evolucionado mis personajes y facciones según mis notas?',
        '¿Qué monstruo equilibrado puedo usar para el siguiente encuentro?',
        '¿Cuál fue el desenlace del último combate según el resumen?',
        'Ayúdame a improvisar una trampa o giro de trama para mi sesión actual',
      ]
    : [
        '¿Qué objetos tengo actualmente en mi inventario?',
        '¿Puedo lanzar dos conjuros en el mismo turno?',
        '¿Cómo funciona el ataque de oportunidad?',
        '¿Cómo se calcula la dificultad (CD) para mantener la concentración?',
        'Dame una recomendación para subir de nivel a mi personaje',
      ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) {
        headers['x-gemini-api-key'] = customApiKey;
      }
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: text,
          model: customModel,
          isDm: Boolean(dmContext),
          characterContext: characterContext
            ? {
                name: characterContext.name,
                race: characterContext.race,
                characterClass: characterContext.characterClass,
                level: characterContext.level,
                currentHp: characterContext.currentHp,
                maxHp: characterContext.maxHp,
                tempHp: characterContext.tempHp,
                armorClass: characterContext.armorClass,
                abilities: characterContext.abilities,
                skills: characterContext.skills,
                inventory: characterContext.inventory,
                currency: characterContext.currency,
                attacks: characterContext.attacks,
                featuresAndTraits: characterContext.featuresAndTraits,
              }
            : undefined,
          dmContext: dmContext
            ? {
                campaignTitle: dmContext.campaignLogs[0]?.title || 'Aventura Activa',
                currentQuest: dmContext.currentQuest,
                npcs: dmContext.npcs,
                monsters: dmContext.monsters,
                locations: dmContext.locations,
                campaignLogs: dmContext.campaignLogs,
                combatSummaries: dmContext.combatSummaries,
              }
            : undefined,
        }),
      });

      const data = await response.json();
      const oracleMsg: Message = {
        id: `ora-${Date.now()}`,
        sender: 'oracle',
        text: data.text || 'El éter arcano está en silencio.',
        isOffline: data.isOffline,
      };

      setMessages((prev) => [...prev, oracleMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'oracle',
          text: 'Las hebras mágicas sufrieron una perturbación. Puedes consultar las reglas directamente en el Compendio SRD integrado.',
          isOffline: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="oracle-title"
    >
      <div className="relative w-full max-w-2xl h-[85vh] bg-[#181920] border-2 border-purple-800/60 rounded-2xl shadow-2xl p-5 text-stone-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-900/40 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
            <div>
              <h2 id="oracle-title" className="text-xl font-bold font-cinzel text-purple-300">
                El Sabio Arcano (Gemini Flash)
              </h2>
              <div className="text-[11px] text-stone-400">
                Árbitro de Reglas 5E, Asesor de Personajes y Guía del DM
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition"
            aria-label="Cerrar oráculo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick prompt suggestions */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(qp)}
              className="px-2.5 py-1 rounded-full bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800/60 text-purple-200 text-xs whitespace-nowrap transition"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Chat message history */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'oracle' && (
                <div className="w-8 h-8 rounded-full bg-purple-950 border border-purple-600 flex items-center justify-center text-purple-300 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-amber-700 text-white rounded-br-xs'
                    : 'bg-[#121316] border border-stone-800 text-stone-200 rounded-bl-xs'
                }`}
              >
                {m.text}
                {m.isOffline && (
                  <div className="text-[10px] text-amber-500 mt-2 italic border-t border-stone-800 pt-1">
                    *Compendio Offline activado
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-amber-900 border border-amber-600 flex items-center justify-center text-amber-200 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-xs text-purple-300 animate-pulse py-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <span>Consultando los tomos sagrados de 5E...</span>
            </div>
          )}
        </div>

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="mt-3 pt-3 border-t border-stone-800 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Pregunta sobre reglas, acciones, tu inventario o balance de combate..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-[#121316] border border-stone-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-stone-100 text-xs sm:text-sm"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="p-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl transition"
            aria-label="Enviar pregunta"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
