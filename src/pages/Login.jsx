import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { username } }
      })
      if (error) setError(error.message)
      else setInfo('Проверьте почту для подтверждения регистрации!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f1117]">
      <div className="w-full max-w-sm p-8 bg-[#1a1d27] rounded-2xl shadow-2xl border border-[#2a2d3a]">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💬</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">MalzevGram</h1>
          <p className="text-gray-400 mt-1 text-sm">Семейный мессенджер</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && (
            <input
              type="text" placeholder="Имя пользователя" value={username}
              onChange={e => setUsername(e.target.value)} required
              className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d3a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
            />
          )}
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d3a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
          />
          <input
            type="password" placeholder="Пароль (мин. 6 символов)" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
            className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d3a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
          />
          {error && <p className="text-red-400 text-xs px-1">{error}</p>}
          {info && <p className="text-green-400 text-xs px-1">{info}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-white font-medium transition text-sm"
          >
            {loading ? 'Загрузка...' : isSignUp ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(''); setInfo('') }}
          className="w-full mt-4 text-gray-400 hover:text-white text-xs transition"
        >
          {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
        </button>
      </div>
    </div>
  )
}
