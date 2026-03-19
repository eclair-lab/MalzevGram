import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import CreateChatModal from './CreateChatModal'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function Sidebar({ session, profile, selectedChat, onSelectChat }) {
  const [chats, setChats] = useState([])
  const [showCreate, setShowCreate] = useState(false)

  const fetchChats = useCallback(async () => {
    const { data: memberRows } = await supabase
      .from('chat_members').select('chat_id').eq('user_id', session.user.id)
    if (!memberRows?.length) return

    const ids = memberRows.map(m => m.chat_id)
    const { data: chatsData } = await supabase
      .from('chats').select('*').in('id', ids).order('created_at', { ascending: false })

    const enriched = await Promise.all((chatsData || []).map(async chat => {
      const { data: lastMsg } = await supabase
        .from('messages').select('content, file_name, file_type, created_at')
        .eq('chat_id', chat.id).order('created_at', { ascending: false }).limit(1).single()

      if (!chat.is_group) {
        const { data: members } = await supabase
          .from('chat_members')
          .select('user_id, profiles(username)')
          .eq('chat_id', chat.id)
        const other = members?.find(m => m.user_id !== session.user.id)
        return { ...chat, displayName: other?.profiles?.username || '?', lastMsg }
      }
      return { ...chat, displayName: chat.name || 'Группа', lastMsg }
    }))

    enriched.sort((a, b) => {
      const ta = a.lastMsg?.created_at || a.created_at
      const tb = b.lastMsg?.created_at || b.created_at
      return new Date(tb) - new Date(ta)
    })
    setChats(enriched)
  }, [session])

  useEffect(() => {
    fetchChats()
    const ch = supabase.channel('sidebar_refresh')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchChats)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_members' }, fetchChats)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchChats])

  const getLastMsgPreview = (msg) => {
    if (!msg) return 'Нет сообщений'
    if (msg.content) return msg.content
    if (msg.file_type?.startsWith('image/')) return '🖼️ Фото'
    if (msg.file_type?.startsWith('video/')) return '🎥 Видео'
    if (msg.file_type?.startsWith('audio/')) return '🎵 Аудио'
    if (msg.file_name) return `📎 ${msg.file_name}`
    return 'Файл'
  }

  return (
    <aside className="w-72 bg-[#1a1d27] flex flex-col border-r border-[#2a2d3a] flex-shrink-0">
      <div className="p-4 flex items-center justify-between border-b border-[#2a2d3a]">
        <div>
          <h2 className="font-bold text-white text-sm">MalzevGram</h2>
          <p className="text-xs text-gray-400 truncate">{profile?.username}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setShowCreate(true)}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition" title="Новый чат">
            ✏️
          </button>
          <button onClick={() => supabase.auth.signOut()}
            className="p-2 rounded-lg hover:bg-[#2a2d3a] text-gray-400 text-sm transition" title="Выйти">
            🚪
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-xs">
            Нет чатов.<br />Нажмите ✏️ чтобы начать
          </div>
        ) : chats.map(chat => (
          <button key={chat.id} onClick={() => onSelectChat(chat)}
            className={`w-full p-3 flex items-center gap-3 hover:bg-[#242736] transition text-left ${selectedChat?.id === chat.id ? 'bg-[#242736]' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {chat.is_group ? '👥' : (chat.displayName?.[0] || '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline gap-1">
                <span className="font-medium text-white text-sm truncate">{chat.displayName}</span>
                {chat.lastMsg && (
                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                    {formatDistanceToNow(new Date(chat.lastMsg.created_at), { locale: ru, addSuffix: false })}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">{getLastMsgPreview(chat.lastMsg)}</p>
            </div>
          </button>
        ))}
      </div>

      {showCreate && (
        <CreateChatModal session={session} onClose={() => setShowCreate(false)}
          onChatCreated={chat => { fetchChats(); onSelectChat(chat); setShowCreate(false) }} />
      )}
    </aside>
  )
}
