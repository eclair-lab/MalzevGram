import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function CreateChatModal({ session, onClose, onChatCreated }) {
  const [mode, setMode] = useState('dm')
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState([])
  const [groupName, setGroupName] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('*').neq('id', session.user.id)
      .then(({ data }) => setUsers(data || []))
  }, [])

  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))

  const toggle = (user) => {
    if (mode === 'dm') { setSelected([user]); return }
    setSelected(prev => prev.find(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user])
  }

  const handleCreate = async () => {
    if (!selected.length) return
    setLoading(true)
    const isGroup = mode === 'group'

    // Для ЛС — проверить существующий чат
    if (!isGroup) {
      const { data: mine } = await supabase.from('chat_members').select('chat_id').eq('user_id', session.user.id)
      const myIds = mine?.map(m => m.chat_id) || []
      if (myIds.length) {
        const { data: theirs } = await supabase.from('chat_members')
          .select('chat_id, chats(is_group)').eq('user_id', selected[0].id).in('chat_id', myIds)
        const existing = theirs?.find(m => !m.chats?.is_group)
        if (existing) {
          const { data: c } = await supabase.from('chats').select('*').eq('id', existing.chat_id).single()
          onChatCreated({ ...c, displayName: selected[0].username })
          return
        }
      }
    }

    const { data: chat, error } = await supabase.from('chats')
      .insert({ name: isGroup ? groupName : null, is_group: isGroup, created_by: session.user.id })
      .select().single()

    if (error) { setLoading(false); return }

    await supabase.from('chat_members').insert([
      { chat_id: chat.id, user_id: session.user.id },
      ...selected.map(u => ({ chat_id: chat.id, user_id: u.id }))
    ])

    onChatCreated({ ...chat, displayName: isGroup ? groupName : selected[0].username })
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1d27] rounded-2xl w-[360px] p-6 shadow-2xl border border-[#2a2d3a]" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-base mb-4">Новый чат</h3>

        <div className="flex gap-2 mb-4">
          {['dm', 'group'].map(m => (
            <button key={m} onClick={() => { setMode(m); setSelected([]) }}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${mode === m ? 'bg-blue-600 text-white' : 'bg-[#0f1117] text-gray-400 hover:text-white'}`}>
              {m === 'dm' ? '💬 Личный чат' : '👥 Группа'}
            </button>
          ))}
        </div>

        {mode === 'group' && (
          <input type="text" placeholder="Название группы" value={groupName}
            onChange={e => setGroupName(e.target.value)}
            className="w-full px-3 py-2 mb-3 bg-[#0f1117] border border-[#2a2d3a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs" />
        )}

        <input type="text" placeholder="🔍 Поиск по имени..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 mb-2 bg-[#0f1117] border border-[#2a2d3a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs" />

        <div className="max-h-44 overflow-y-auto space-y-1 mb-4">
          {filtered.length === 0
            ? <p className="text-gray-500 text-xs text-center py-4">Нет пользователей</p>
            : filtered.map(user => (
              <button key={user.id} onClick={() => toggle(user)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition ${selected.find(u => u.id === user.id) ? 'bg-blue-600 text-white' : 'hover:bg-[#2a2d3a] text-gray-300'}`}>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user.username[0].toUpperCase()}
                </div>
                <span className="text-xs">{user.username}</span>
                {selected.find(u => u.id === user.id) && <span className="ml-auto text-xs">✓</span>}
              </button>
            ))}
        </div>

        {mode === 'group' && selected.length > 0 && (
          <p className="text-xs text-gray-400 mb-3">Выбрано: {selected.map(u => u.username).join(', ')}</p>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-[#0f1117] text-gray-400 hover:text-white text-xs transition">
            Отмена
          </button>
          <button onClick={handleCreate}
            disabled={!selected.length || loading || (mode === 'group' && !groupName.trim())}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium transition">
            {loading ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}
