import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import MessageInput from './MessageInput'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function ChatWindow({ chat, session }) {
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [profilesMap, setProfilesMap] = useState({})
  const bottomRef = useRef(null)

  useEffect(() => {
    setMessages([])
    fetchMessages()
    fetchMembers()

    const channel = supabase.channel(`chat:${chat.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` },
        (payload) => setMessages(prev => [...prev, payload.new])
      ).subscribe()

    return () => supabase.removeChannel(channel)
  }, [chat.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages').select('*').eq('chat_id', chat.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('chat_members').select('user_id, profiles(id, username)')
      .eq('chat_id', chat.id)
    setMembers(data || [])
    const map = {}
    data?.forEach(m => { if (m.profiles) map[m.profiles.id] = m.profiles.username })
    setProfilesMap(map)
  }

  const isOwn = (msg) => msg.sender_id === session.user.id

  const renderFile = (msg, own) => {
    if (!msg.file_url) return null
    const type = msg.file_type || ''
    const linkClass = `underline text-xs flex items-center gap-1 ${own ? 'text-blue-200' : 'text-blue-400'}`

    if (type.startsWith('image/')) return (
      <img src={msg.file_url} alt={msg.file_name}
        className="max-w-full rounded-lg max-h-56 object-cover cursor-pointer mt-1"
        onClick={() => window.open(msg.file_url, '_blank')} />
    )
    if (type.startsWith('video/')) return (
      <video src={msg.file_url} controls className="max-w-full rounded-lg max-h-48 mt-1" />
    )
    if (type.startsWith('audio/')) return (
      <audio src={msg.file_url} controls className="mt-1 w-full" />
    )
    return (
      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className={linkClass + ' mt-1'}>
        📎 <span className="truncate max-w-[180px]">{msg.file_name}</span>
      </a>
    )
  }

  const groupByDate = (msgs) => {
    const groups = []
    let lastDate = null
    msgs.forEach(msg => {
      const d = format(new Date(msg.created_at), 'd MMMM yyyy', { locale: ru })
      if (d !== lastDate) { groups.push({ type: 'date', label: d }); lastDate = d }
      groups.push({ type: 'msg', msg })
    })
    return groups
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#2a2d3a] bg-[#1a1d27] flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {chat.is_group ? '👥' : (chat.displayName?.[0] || '?').toUpperCase()}
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">{chat.displayName}</h3>
          {chat.is_group && <p className="text-xs text-gray-400">{members.length} участников</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {groupByDate(messages).map((item, i) => {
          if (item.type === 'date') return (
            <div key={i} className="flex justify-center my-3">
              <span className="text-xs text-gray-500 bg-[#1a1d27] px-3 py-1 rounded-full">{item.label}</span>
            </div>
          )
          const msg = item.msg
          const own = isOwn(msg)
          const senderName = profilesMap[msg.sender_id] || '?'
          return (
            <div key={msg.id} className={`flex ${own ? 'justify-end' : 'justify-start'} mb-1`}>
              <div className={`max-w-[70%] flex flex-col ${own ? 'items-end' : 'items-start'}`}>
                {!own && chat.is_group && (
                  <span className="text-xs text-blue-400 mb-0.5 ml-1">{senderName}</span>
                )}
                <div className={`px-3 py-2 rounded-2xl ${own ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-[#2a2d3a] text-white rounded-bl-sm'}`}>
                  {msg.content && <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>}
                  {renderFile(msg, own)}
                  <p className={`text-[10px] mt-1 ${own ? 'text-blue-200 text-right' : 'text-gray-500'}`}>
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <MessageInput chatId={chat.id} session={session} />
    </div>
  )
}
