// import { useState, useRef, useEffect, useCallback } from 'react'
// import {
//   MessageCircleIcon,
//   SendIcon,
//   XIcon,
//   Loader2Icon,
//   BotIcon,
//   Maximize2Icon,
//   Minimize2Icon,
// } from 'lucide-react'
// import api from '../api/axios'
// import toast from 'react-hot-toast'
// import { useAuth } from '../context/AuthContext'

// const ChatWidget = () => {
//   const { user } = useAuth()
//   const [open, setOpen] = useState(false)
//   const [fullscreen, setFullscreen] = useState(false)
//   const [msgs, setMsgs] = useState([])
//   const [input, setInput] = useState("")
//   const [loading, setLoading] = useState(false)
//   const [userName, setUserName] = useState("")
//   const endRef = useRef(null)
//   const inputRef = useRef(null)

//   const fetchName = useCallback(async () => {
//     try {
//       const { data } = await api.get("/profile")
//       if (data.firstName) setUserName(data.firstName)
//     } catch {
//       // silent - greeting just falls back to generic
//     }
//   }, [])

//   useEffect(() => {
//     if (!user) return

//     const timer = setTimeout(fetchName, 0)
//     return () => clearTimeout(timer)
//   }, [user, fetchName])

//   useEffect(() => {
//     endRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [msgs, open])

//   useEffect(() => {
//     if (open) inputRef.current?.focus()
//   }, [open, fullscreen])

//   const send = async () => {
//     const text = input.trim()
//     if (!text || loading) return

//     const next = [...msgs, { role: "user", content: text }]
//     setMsgs(next)
//     setInput("")
//     setLoading(true)

//     try {
//       const history = next.slice(0, -1).map((m) => ({ role: m.role, content: m.content }))
//       const { data } = await api.post("/chatbot", { message: text, history })
//       setMsgs([...next, { role: "assistant", content: data.reply }])
//     } catch (err) {
//       toast.error(err.response?.data?.error || err.message)
//       setMsgs(next)
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleKey = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault()
//       send()
//     }
//   }

//   const closeChat = () => {
//     setOpen(false)
//     setFullscreen(false)
//   }

//   if (!user) return null

//   const greeting = userName ? `Hi ${userName}, how can I help you today?` : "Hi there, how can I help you today?"

//   return (
//     <>
//       {/* Launcher */}
//       <button
//         onClick={() => setOpen(true)}
//         className={`fixed bottom-5 right-5 z-40 p-4 rounded-full bg-linear-to-br from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-transform ${open ? "hidden" : ""}`}
//       >
//         <MessageCircleIcon className="w-5 h-5" />
//       </button>

//       {open && (
//         <div
//           className={`fixed z-50 bg-white shadow-2xl border border-slate-200 flex flex-col animate-fade-in transition-all duration-200 ${
//             fullscreen
//               ? "inset-0 rounded-none"
//               : "bottom-5 right-5 w-full max-w-sm h-[560px] rounded-2xl"
//           }`}
//         >
//           {/* Header */}
//           <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-linear-to-r from-indigo-600 to-indigo-500 rounded-t-2xl shrink-0"
//             style={fullscreen ? { borderRadius: 0 } : undefined}
//           >
//             <div className="flex items-center gap-2.5">
//               <div className="p-1.5 bg-white/15 rounded-lg">
//                 <BotIcon className="w-4 h-4 text-white" />
//               </div>
//               <div>
//                 <p className="font-medium text-white text-sm leading-tight">EMS Assistant</p>
//                 <p className="text-[11px] text-indigo-100 leading-tight">Online</p>
//               </div>
//             </div>
//             <div className="flex items-center gap-1">
//               <button
//                 onClick={() => setFullscreen((f) => !f)}
//                 className="p-2 rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition-colors"
//               >
//                 {fullscreen ? <Minimize2Icon className="w-4 h-4" /> : <Maximize2Icon className="w-4 h-4" />}
//               </button>
//               <button
//                 onClick={closeChat}
//                 className="p-2 rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition-colors"
//               >
//                 <XIcon className="w-4 h-4" />
//               </button>
//             </div>
//           </div>

//           {/* Messages */}
//           <div className={`flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 ${fullscreen ? "max-w-3xl w-full mx-auto" : ""}`}>
//             <div className="flex justify-start">
//               <div className="max-w-[85%] px-3.5 py-2.5 rounded-xl rounded-bl-sm text-sm bg-white border border-slate-200 text-slate-700 shadow-sm">
//                 {greeting}
//               </div>
//             </div>

//             {msgs.map((m, i) => (
//               <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
//                 <div
//                   className={`max-w-[85%] px-3.5 py-2.5 text-sm whitespace-pre-wrap shadow-sm ${
//                     m.role === "user"
//                       ? "bg-linear-to-br from-indigo-600 to-indigo-500 text-white rounded-xl rounded-br-sm"
//                       : "bg-white border border-slate-200 text-slate-700 rounded-xl rounded-bl-sm"
//                   }`}
//                 >
//                   {m.content}
//                 </div>
//               </div>
//             ))}

//             {loading && (
//               <div className="flex justify-start">
//                 <div className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl rounded-bl-sm shadow-sm">
//                   <Loader2Icon className="w-4 h-4 animate-spin text-indigo-500" />
//                 </div>
//               </div>
//             )}
//             <div ref={endRef} />
//           </div>

//           {/* Input */}
//           <div className={`p-3 border-t border-slate-100 flex gap-2 shrink-0 ${fullscreen ? "max-w-3xl w-full mx-auto" : ""}`}>
//             <input
//               ref={inputRef}
//               value={input}
//               onChange={(e) => setInput(e.target.value)}
//               onKeyDown={handleKey}
//               placeholder="Ask about attendance, leave, payslips..."
//               className="flex-1"
//             />
//             <button
//               onClick={send}
//               disabled={loading || !input.trim()}
//               className="p-2.5 rounded-md bg-linear-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50 transition-all active:scale-[0.98] shrink-0"
//             >
//               <SendIcon className="w-4 h-4" />
//             </button>
//           </div>
//         </div>
//       )}
//     </>
//   )
// }

// export default ChatWidget

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageCircleIcon,
  SendIcon,
  XIcon,
  Loader2Icon,
  BotIcon,
  Maximize2Icon,
  Minimize2Icon,
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const ADMIN_QUESTIONS = [
  "How many employees are present today?",
  "How many employees are absent today?",
  "How many pending leave requests are there?",
  "How many employees are in each department?",
]

const EMPLOYEE_QUESTIONS = [
  "How many leaves have I applied for?",
  "How many of my leaves were approved?",
  "How many days was I present this month?",
  "What department am I in?",
]

const ChatWidget = () => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState("")
  const endRef = useRef(null)
  const inputRef = useRef(null)

  const fetchName = useCallback(async () => {
    try {
      const { data } = await api.get("/profile")
      if (data.firstName) setUserName(data.firstName)
    } catch {
      // silent - greeting just falls back to generic
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const timer = setTimeout(fetchName, 0)
    return () => clearTimeout(timer)
  }, [user, fetchName])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open, fullscreen])

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return

    const next = [...msgs, { role: "user", content: text }]
    setMsgs(next)
    setInput("")
    setLoading(true)

    try {
      const history = next.slice(0, -1).map((m) => ({ role: m.role, content: m.content }))
      const { data } = await api.post("/chatbot", { message: text, history })
      setMsgs([...next, { role: "assistant", content: data.reply }])
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Something went wrong")
      setMsgs(next)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const closeChat = () => {
    setOpen(false)
    setFullscreen(false)
  }

  if (!user) return null

  const isAdmin = user.role === "ADMIN"
  const suggestions = isAdmin ? ADMIN_QUESTIONS : EMPLOYEE_QUESTIONS
  const greeting = userName ? `Hi ${userName}, how can I help you today?` : "Hi there, how can I help you today?"

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-40 p-4 rounded-full bg-linear-to-br from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-transform ${open ? "hidden" : ""}`}
      >
        <MessageCircleIcon className="w-5 h-5" />
      </button>

      {open && (
        <div
          className={`fixed z-50 bg-white shadow-2xl border border-slate-200 flex flex-col animate-fade-in transition-all duration-200 ${
            fullscreen
              ? "inset-0 rounded-none"
              : "bottom-5 right-5 w-full max-w-sm h-[560px] rounded-2xl"
          }`}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-linear-to-r from-indigo-600 to-indigo-500 rounded-t-2xl shrink-0"
            style={fullscreen ? { borderRadius: 0 } : undefined}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/15 rounded-lg">
                <BotIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-white text-sm leading-tight">EMS Assistant</p>
                <p className="text-[11px] text-indigo-100 leading-tight">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFullscreen((f) => !f)}
                className="p-2 rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition-colors"
              >
                {fullscreen ? <Minimize2Icon className="w-4 h-4" /> : <Maximize2Icon className="w-4 h-4" />}
              </button>
              <button
                onClick={closeChat}
                className="p-2 rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 ${fullscreen ? "max-w-3xl w-full mx-auto" : ""}`}>
            <div className="flex justify-start">
              <div className="max-w-[85%] px-3.5 py-2.5 rounded-xl rounded-bl-sm text-sm bg-white border border-slate-200 text-slate-700 shadow-sm">
                {greeting}
              </div>
            </div>

            {msgs.length === 0 && (
              <div className="flex flex-col gap-2 pt-1">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q)}
                    className="text-left text-sm px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 text-sm whitespace-pre-wrap shadow-sm ${
                    m.role === "user"
                      ? "bg-linear-to-br from-indigo-600 to-indigo-500 text-white rounded-xl rounded-br-sm"
                      : "bg-white border border-slate-200 text-slate-700 rounded-xl rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl rounded-bl-sm shadow-sm">
                  <Loader2Icon className="w-4 h-4 animate-spin text-indigo-500" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className={`p-3 border-t border-slate-100 flex gap-2 shrink-0 ${fullscreen ? "max-w-3xl w-full mx-auto" : ""}`}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about attendance, leave, payslips..."
              className="flex-1"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-md bg-linear-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50 transition-all active:scale-[0.98] shrink-0"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default ChatWidget