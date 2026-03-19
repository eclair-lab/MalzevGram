import { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function MessageInput({ chatId, session }) {
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const fileRef = useRef()

  const sendMessage = async (payload) => {
    await supabase.from('messages').insert({ chat_id: chatId, sender_id: session.user.id, ...payload })
  }

  const handleSendText = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setText('')
    await sendMessage({ content: trimmed })
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) { alert('Файл слишком большой (макс. 50MB)'); return }

    setUploading(true)
    setUploadProgress('Загружаю...')
    const path = `${session.user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { data, error } = await supabase.storage.from('chat-files').upload(path, file)
    if (error) { alert('Ошибка загрузки: ' + error.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(data.path)
    await sendMessage({ file_url: publicUrl, file_name: file.name, file_type: file.type, file_size: file.size })
    setUploading(false)
    setUploadProgress('')
    fileRef.current.value = ''
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(e) }
  }

  return (
    <div className="p-3 border-t border-[#2a2d3a] bg-[#1a1d27]">
      {uploading && (
        <div className="text-xs text-blue-400 mb-2 px-1">{uploadProgress}</div>
      )}
      <form onSubmit={handleSendText} className="flex items-end gap-2">
        <button type="button" onClick={() => fileRef.current.click()} disabled={uploading}
          className="p-2.5 rounded-xl hover:bg-[#2a2d3a] text-gray-400 hover:text-white transition flex-shrink-0 text-lg"
          title="Прикрепить файл / видео">
          {uploading ? <span className="animate-spin inline-block">⏳</span> : '📎'}
        </button>
        <input ref={fileRef} type="file" onChange={handleFile} className="hidden" accept="*/*" />

        <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Написать сообщение... (Enter — отправить, Shift+Enter — перенос)"
          rows={1}
          className="flex-1 bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none transition text-sm leading-relaxed"
          style={{ maxHeight: '100px', overflowY: 'auto' }} />

        <button type="submit" disabled={!text.trim() || uploading}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white transition flex-shrink-0 text-sm font-bold">
          ➤
        </button>
      </form>
    </div>
  )
}
