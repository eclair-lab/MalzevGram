import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'

export default function Home({ session }) {
  const [selectedChat, setSelectedChat] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setProfile(data))
  }, [session])

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      <Sidebar session={session} profile={profile} selectedChat={selectedChat} onSelectChat={setSelectedChat} />
      <main className="flex-1 flex flex-col min-w-0">
        {selectedChat ? (
          <ChatWindow chat={selectedChat} session={session} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-600">
              <div className="text-7xl mb-4">💬</div>
              <p className="text-lg font-medium">Выберите чат</p>
              <p className="text-sm mt-1">или создайте новый нажав ✏️</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
