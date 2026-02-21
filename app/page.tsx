'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  FaHeartbeat,
  FaHospital,
  FaTint,
  FaPhone,
  FaPaperPlane,
  FaExclamationTriangle,
  FaHeart,
  FaFileAlt,
  FaUser,
  FaMapMarkerAlt,
  FaChevronDown,
  FaChevronUp,
  FaExternalLinkAlt,
  FaGlobe,
  FaArrowLeft,
  FaCheck,
  FaBan,
  FaRobot,
  FaCircle,
  FaHandHoldingHeart,
  FaUserCircle
} from 'react-icons/fa'

/* ================================================================
   CONSTANTS
   ================================================================ */
const AGENT_ID = '69996ce29f3636d6dd80984c'
const AGENT_NAME = 'Seva Health Agent'

/* ================================================================
   TYPES
   ================================================================ */
interface EmergencyNumber {
  name: string
  number: string
  description: string
}
interface Hospital {
  name: string
  type: string
  address: string
  phone: string
  distance: string
}
interface Donor {
  name: string
  blood_group: string
  city: string
  distance: string
}
interface Scheme {
  name: string
  eligibility: string
  documents: string
  how_to_apply: string
  link: string
}
interface OrganDonationInfo {
  awareness: string
  pledge_process: string
  official_link: string
}
interface SevaHealthResponse {
  message: string
  intent: string
  emergency_numbers: EmergencyNumber[]
  hospitals: Hospital[]
  donors: Donor[]
  schemes: Scheme[]
  organ_donation_info: OrganDonationInfo
  consent_required: boolean
  follow_up: string
}
interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  text: string
  data?: SevaHealthResponse
  timestamp: string
}
interface DonorProfile {
  name: string
  bloodGroup: string
  city: string
  phone: string
  isActive: boolean
  donationHistory: Array<{ date: string; requesterCity: string; status: string }>
}

/* ================================================================
   DEFAULTS
   ================================================================ */
const DEFAULT_ORGAN: OrganDonationInfo = { awareness: '', pledge_process: '', official_link: '' }

const DEFAULT_RESPONSE: SevaHealthResponse = {
  message: '',
  intent: 'general',
  emergency_numbers: [],
  hospitals: [],
  donors: [],
  schemes: [],
  organ_donation_info: DEFAULT_ORGAN,
  consent_required: false,
  follow_up: '',
}

/* ================================================================
   SAFE JSON PARSE
   ================================================================ */
function safeParse(value: unknown): any {
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch (_err) {
    return null
  }
}

/* ================================================================
   RESPONSE PARSER
   ================================================================ */
function parseAgentResponse(apiResult: any): SevaHealthResponse {
  if (!apiResult) return { ...DEFAULT_RESPONSE }

  let data: any = null

  // Primary: response.result (object or string)
  const innerResult = apiResult?.response?.result
  if (innerResult) {
    if (typeof innerResult === 'object' && innerResult !== null) {
      data = innerResult
    } else {
      data = safeParse(innerResult)
    }
  }

  // Fallback: response.message as JSON
  if (!data && apiResult?.response?.message) {
    data = safeParse(apiResult.response.message)
  }

  // Fallback: response itself has agent fields
  if (!data && apiResult?.response?.intent) {
    data = apiResult.response
  }

  // Fallback: apiResult itself has agent fields
  if (!data && apiResult?.intent) {
    data = apiResult
  }

  // Fallback: raw_response
  if (!data && apiResult?.raw_response) {
    data = safeParse(apiResult.raw_response)
  }

  // Nested JSON in message field
  if (data?.message && typeof data.message === 'string') {
    const inner = safeParse(data.message)
    if (inner && (inner.intent || inner.message)) {
      data = inner
    }
  }

  // Plain text fallback
  if (!data) {
    const txt = apiResult?.response?.message || ''
    return { ...DEFAULT_RESPONSE, message: typeof txt === 'string' ? txt : String(txt) }
  }

  if (typeof data === 'string') {
    const parsed = safeParse(data)
    if (parsed) {
      data = parsed
    } else {
      return { ...DEFAULT_RESPONSE, message: data }
    }
  }

  return {
    message: String(data?.message || data?.text || ''),
    intent: String(data?.intent || 'general'),
    emergency_numbers: Array.isArray(data?.emergency_numbers) ? data.emergency_numbers : [],
    hospitals: Array.isArray(data?.hospitals) ? data.hospitals : [],
    donors: Array.isArray(data?.donors) ? data.donors : [],
    schemes: Array.isArray(data?.schemes) ? data.schemes : [],
    organ_donation_info:
      data?.organ_donation_info && typeof data.organ_donation_info === 'object'
        ? {
            awareness: String(data.organ_donation_info.awareness || ''),
            pledge_process: String(data.organ_donation_info.pledge_process || ''),
            official_link: String(data.organ_donation_info.official_link || ''),
          }
        : { ...DEFAULT_ORGAN },
    consent_required: Boolean(data?.consent_required),
    follow_up: String(data?.follow_up || ''),
  }
}

/* ================================================================
   MARKDOWN HELPERS
   ================================================================ */
function formatInline(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">{part}</strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  )
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

/* ================================================================
   QUICK ACTIONS CONFIG
   ================================================================ */
const QUICK_ACTIONS = [
  { label: 'Emergency', icon: FaExclamationTriangle, message: 'I need emergency help', color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' },
  { label: 'Hospital', icon: FaHospital, message: 'Find nearby hospitals', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
  { label: 'Donate Blood', icon: FaTint, message: 'I want to donate blood', color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100' },
  { label: 'Need Blood', icon: FaTint, message: 'I need blood urgently', color: 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100' },
  { label: 'Schemes', icon: FaFileAlt, message: 'Tell me about government health schemes', color: 'text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100' },
  { label: 'Organ Donation', icon: FaHeart, message: 'Tell me about organ donation', color: 'text-pink-600 bg-pink-50 border-pink-200 hover:bg-pink-100' },
]

/* ================================================================
   SAMPLE DATA
   ================================================================ */
const SAMPLE_MESSAGES: ChatMessage[] = [
  { id: 's1', role: 'user', text: 'I need emergency help', timestamp: '10:00 AM' },
  {
    id: 's2', role: 'agent', text: '',
    data: {
      message: 'Here are the emergency numbers. Please stay calm and call the nearest service.',
      intent: 'emergency',
      emergency_numbers: [
        { name: 'Ambulance', number: '108', description: 'Emergency ambulance 24/7' },
        { name: 'Emergency', number: '112', description: 'National emergency number' },
        { name: 'Women Helpline', number: '181', description: 'Women in distress' },
      ],
      hospitals: [], donors: [], schemes: [],
      organ_donation_info: { ...DEFAULT_ORGAN },
      consent_required: false,
      follow_up: 'Would you like me to find the nearest hospital?',
    },
    timestamp: '10:01 AM',
  },
  { id: 's3', role: 'user', text: 'Find nearby hospitals', timestamp: '10:02 AM' },
  {
    id: 's4', role: 'agent', text: '',
    data: {
      message: 'Here are hospitals near your area.',
      intent: 'hospital_finder',
      emergency_numbers: [],
      hospitals: [
        { name: 'NIMS Hospital', type: 'Government', address: 'Punjagutta, Hyderabad', phone: '040-23390000', distance: '4.0 km' },
        { name: 'Gandhi Hospital', type: 'Government', address: 'Musheerabad, Hyderabad', phone: '040-27505566', distance: '5.2 km' },
      ],
      donors: [], schemes: [],
      organ_donation_info: { ...DEFAULT_ORGAN },
      consent_required: false,
      follow_up: 'Need directions to any of these hospitals?',
    },
    timestamp: '10:03 AM',
  },
]

const SAMPLE_PROFILE: DonorProfile = {
  name: 'Ravi Kumar',
  bloodGroup: 'O+',
  city: 'Hyderabad',
  phone: '+91 98765 43210',
  isActive: true,
  donationHistory: [
    { date: '2025-01-15', requesterCity: 'Secunderabad', status: 'Completed' },
    { date: '2024-11-20', requesterCity: 'Hyderabad', status: 'Completed' },
  ],
}

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FaHeartbeat className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function WelcomeCard({ onAction }: { onAction: (m: string) => void }) {
  return (
    <div className="px-4 py-6">
      <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 border-primary/20 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <FaHeartbeat className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">Welcome to Seva Health</h2>
              <p className="text-sm text-muted-foreground">Your health companion</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <ul className="space-y-1.5 text-sm text-muted-foreground ml-1">
            <li className="flex items-center gap-2"><FaExclamationTriangle className="w-3 h-3 text-destructive flex-shrink-0" /> Emergency numbers and help</li>
            <li className="flex items-center gap-2"><FaHospital className="w-3 h-3 text-primary flex-shrink-0" /> Find nearby hospitals</li>
            <li className="flex items-center gap-2"><FaTint className="w-3 h-3 text-destructive flex-shrink-0" /> Blood donation and requests</li>
            <li className="flex items-center gap-2"><FaFileAlt className="w-3 h-3 text-accent flex-shrink-0" /> Government health schemes</li>
            <li className="flex items-center gap-2"><FaHeart className="w-3 h-3 text-pink-500 flex-shrink-0" /> Organ donation info</li>
          </ul>
          <div className="mt-5">
            <Button variant="default" size="sm" className="rounded-xl" onClick={() => onAction('Hello, what can you help me with?')}>
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EmergencyBanner({ numbers }: { numbers: EmergencyNumber[] }) {
  if (!Array.isArray(numbers) || numbers.length === 0) return null
  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mt-3">
      <div className="flex items-center gap-2 mb-3">
        <FaExclamationTriangle className="w-4 h-4 text-destructive" />
        <span className="text-sm font-semibold text-destructive">Emergency Numbers</span>
      </div>
      <div className="space-y-2">
        {numbers.map((item, idx) => (
          <a key={idx} href={'tel:' + (item?.number || '')} className="flex items-center justify-between p-3 bg-background/80 rounded-lg border border-destructive/20 hover:bg-destructive/5 transition-colors">
            <div>
              <div className="text-sm font-medium text-foreground">{item?.name || 'Unknown'}</div>
              <div className="text-xs text-muted-foreground">{item?.description || ''}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-destructive">{item?.number || ''}</span>
              <FaPhone className="w-3 h-3 text-destructive" />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

function HospitalCards({ hospitals }: { hospitals: Hospital[] }) {
  if (!Array.isArray(hospitals) || hospitals.length === 0) return null
  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center gap-2 mb-1">
        <FaHospital className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Nearby Hospitals</span>
      </div>
      {hospitals.map((h, idx) => (
        <Card key={idx} className="bg-background/80 border-border/60 shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-foreground truncate">{h?.name || 'Hospital'}</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {h?.type && <Badge variant="secondary" className="text-xs">{h.type}</Badge>}
              {h?.distance && <Badge variant="outline" className="text-xs">{h.distance}</Badge>}
            </div>
            {h?.address && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
                <FaMapMarkerAlt className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{h.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {h?.phone && (
                <a href={'tel:' + h.phone} className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
                  <FaPhone className="w-2.5 h-2.5" /> {h.phone}
                </a>
              )}
              <a
                href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((h?.name || '') + ' ' + (h?.address || ''))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-2.5 py-1.5 rounded-lg hover:bg-accent/20 transition-colors"
              >
                <FaMapMarkerAlt className="w-2.5 h-2.5" /> Navigate
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DonorCards({ donors, onRequest }: { donors: Donor[]; onRequest: (n: string) => void }) {
  if (!Array.isArray(donors) || donors.length === 0) return null
  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center gap-2 mb-1">
        <FaTint className="w-4 h-4 text-destructive" />
        <span className="text-sm font-semibold text-foreground">Donor Matches</span>
      </div>
      {donors.map((d, idx) => (
        <Card key={idx} className="bg-background/80 border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <FaUser className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{d?.name || 'Anonymous'}</div>
                  <div className="text-xs text-muted-foreground">{[d?.city, d?.distance].filter(Boolean).join(' - ')}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className="bg-destructive text-destructive-foreground text-sm font-bold px-3">{d?.blood_group || '?'}</Badge>
                <Button variant="outline" size="sm" className="text-xs rounded-lg h-7" onClick={() => onRequest(d?.name || 'donor')}>
                  Request Contact
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SchemeCards({ schemes }: { schemes: Scheme[] }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  if (!Array.isArray(schemes) || schemes.length === 0) return null
  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center gap-2 mb-1">
        <FaFileAlt className="w-4 h-4 text-accent" />
        <span className="text-sm font-semibold text-foreground">Health Schemes</span>
      </div>
      {schemes.map((s, idx) => (
        <Card key={idx} className="bg-background/80 border-border/60 shadow-sm overflow-hidden">
          <button
            className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            onClick={() => setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }))}
          >
            <span className="text-sm font-semibold text-foreground pr-2">{s?.name || 'Scheme'}</span>
            {expanded[idx] ? <FaChevronUp className="w-3 h-3 text-muted-foreground flex-shrink-0" /> : <FaChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
          </button>
          {expanded[idx] && (
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <Separator />
              {s?.eligibility && <div><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Eligibility</div><p className="text-sm text-foreground">{s.eligibility}</p></div>}
              {s?.documents && <div><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Documents</div><p className="text-sm text-foreground">{s.documents}</p></div>}
              {s?.how_to_apply && <div><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">How to Apply</div><p className="text-sm text-foreground">{s.how_to_apply}</p></div>}
              {s?.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"><FaExternalLinkAlt className="w-2.5 h-2.5" /> Learn More</a>}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

function OrganDonationCard({ info }: { info: OrganDonationInfo }) {
  if (!info?.awareness && !info?.pledge_process && !info?.official_link) return null
  return (
    <Card className="bg-pink-50/50 border-pink-200/50 shadow-sm mt-3">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FaHeart className="w-4 h-4 text-pink-500" />
          <span className="text-sm font-semibold text-foreground">Organ Donation</span>
        </div>
        {info.awareness && <div className="mb-3"><div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Awareness</div><div className="text-sm">{renderMarkdown(info.awareness)}</div></div>}
        {info.pledge_process && <div className="mb-3"><div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Pledge Process</div><div className="text-sm">{renderMarkdown(info.pledge_process)}</div></div>}
        {info.official_link && <a href={info.official_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-pink-600 font-medium"><FaExternalLinkAlt className="w-2.5 h-2.5" /> Official Website</a>}
      </CardContent>
    </Card>
  )
}

function ConsentCard({ onAgree, onCancel }: { onAgree: () => void; onCancel: () => void }) {
  return (
    <Card className="bg-amber-50/50 border-amber-200/50 shadow-sm mt-3">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FaHandHoldingHeart className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-foreground">Consent Required</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Your details will be shared with people who need blood of your type. Only your first name, blood group, and city will be visible. Do you agree?
        </p>
        <div className="flex items-center gap-3">
          <Button size="sm" className="rounded-xl" onClick={onAgree}><FaCheck className="w-3 h-3 mr-1.5" /> I Agree</Button>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={onCancel}><FaBan className="w-3 h-3 mr-1.5" /> Cancel</Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ================================================================
   MESSAGE BUBBLES
   ================================================================ */
function AgentBubble({ msg, onSend }: { msg: ChatMessage; onSend: (t: string) => void }) {
  const d = msg.data
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <FaHeartbeat className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          {d?.message ? renderMarkdown(d.message) : msg.text ? renderMarkdown(msg.text) : null}
          {d && (
            <>
              <EmergencyBanner numbers={d.emergency_numbers} />
              <HospitalCards hospitals={d.hospitals} />
              <DonorCards donors={d.donors} onRequest={(name) => onSend('I would like to request contact details for donor ' + name)} />
              <SchemeCards schemes={d.schemes} />
              <OrganDonationCard info={d.organ_donation_info} />
              {d.consent_required && <ConsentCard onAgree={() => onSend('I agree')} onCancel={() => onSend('I do not consent')} />}
              {d.follow_up && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <button onClick={() => onSend(d.follow_up)} className="text-xs text-primary hover:text-primary/80 font-medium text-left">
                    {d.follow_up}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 ml-1">{msg.timestamp}</div>
      </div>
    </div>
  )
}

function UserBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex items-start justify-end gap-3 px-4 py-2">
      <div className="max-w-[80%]">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed">{msg.text}</p>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 text-right mr-1">{msg.timestamp}</div>
      </div>
    </div>
  )
}

/* ================================================================
   DONOR PROFILE VIEW
   ================================================================ */
function ProfileView({ profile, setProfile, onBack }: { profile: DonorProfile; setProfile: React.Dispatch<React.SetStateAction<DonorProfile>>; onBack: () => void }) {
  const [showOptOut, setShowOptOut] = useState(false)
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex items-center gap-3 p-4 bg-card/80 backdrop-blur-md border-b border-border/60 sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-xl"><FaArrowLeft className="w-4 h-4" /></Button>
        <h2 className="text-lg font-semibold tracking-tight">Donor Profile</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 pb-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FaUserCircle className="w-10 h-10 text-primary/60" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{profile.name || 'Your Name'}</h3>
              <Badge className="bg-destructive text-destructive-foreground text-sm font-bold mt-1">{profile.bloodGroup || '?'}</Badge>
            </div>
          </div>

          <Card className="bg-card/80 border-border/60">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className="mt-1 rounded-xl" placeholder="Enter your name" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Blood Group</Label>
                <Select value={profile.bloodGroup} onValueChange={(v) => setProfile((p) => ({ ...p, bloodGroup: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Select blood group" /></SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input value={profile.city} onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))} className="mt-1 rounded-xl" placeholder="Enter your city" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input value={profile.phone} readOnly className="mt-1 rounded-xl bg-muted/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Availability</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{profile.isActive ? 'Visible to requesters' : 'Hidden from requests'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{profile.isActive ? 'Active' : 'Paused'}</span>
                  <Switch checked={profile.isActive} onCheckedChange={(c) => setProfile((p) => ({ ...p, isActive: c }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border/60">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Donation History</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {profile.donationHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No donation history yet.</p>
              ) : (
                profile.donationHistory.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-foreground">{h.requesterCity}</div>
                      <div className="text-xs text-muted-foreground">{h.date}</div>
                    </div>
                    <Badge variant={h.status === 'Completed' ? 'default' : 'secondary'} className="text-xs">{h.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Button variant="destructive" className="w-full rounded-xl" onClick={() => setShowOptOut(true)}>
            <FaBan className="w-3 h-3 mr-2" /> Opt Out of Donor Program
          </Button>

          {showOptOut && (
            <Card className="bg-destructive/5 border-destructive/30">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-foreground mb-4">Are you sure? You will no longer receive blood donation requests.</p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="destructive" size="sm" className="rounded-xl" onClick={() => { setProfile((p) => ({ ...p, isActive: false })); setShowOptOut(false) }}>Yes, Opt Out</Button>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowOptOut(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   MAIN PAGE
   ================================================================ */
export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [showSample, setShowSample] = useState(false)
  const [language, setLanguage] = useState<'EN' | 'TE'>('EN')
  const [view, setView] = useState<'chat' | 'profile'>('chat')
  const [sessionId, setSessionId] = useState('')
  const [profile, setProfile] = useState<DonorProfile>({
    name: '', bloodGroup: '', city: '', phone: '+91 XXXXX XXXXX', isActive: false, donationHistory: [],
  })

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setSessionId(crypto.randomUUID()) }, [])

  useEffect(() => {
    if (showSample) {
      setMessages(SAMPLE_MESSAGES)
      setProfile(SAMPLE_PROFILE)
    } else {
      setMessages([])
      setProfile({ name: '', bloodGroup: '', city: '', phone: '+91 XXXXX XXXXX', isActive: false, donationHistory: [] })
    }
  }, [showSample])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isLoading])

  const getTime = useCallback(() => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }), [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    const userMsg: ChatMessage = { id: 'u-' + Date.now(), role: 'user', text: text.trim(), timestamp: getTime() }
    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)
    setActiveAgent(AGENT_ID)

    try {
      const result = await callAIAgent(text.trim(), AGENT_ID, { session_id: sessionId })
      const parsed = parseAgentResponse(result)
      const agentMsg: ChatMessage = { id: 'a-' + Date.now(), role: 'agent', text: parsed.message, data: parsed, timestamp: getTime() }
      setMessages((prev) => [...prev, agentMsg])
    } catch (_err) {
      const errMsg: ChatMessage = {
        id: 'e-' + Date.now(), role: 'agent', text: 'Sorry, something went wrong. Please try again.',
        data: { ...DEFAULT_RESPONSE, message: 'Sorry, something went wrong. Please try again.' },
        timestamp: getTime(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsLoading(false)
      setActiveAgent(null)
    }
  }, [isLoading, sessionId, getTime])

  const handleSubmit = useCallback((e: React.FormEvent) => { e.preventDefault(); sendMessage(inputValue) }, [inputValue, sendMessage])

  if (view === 'profile') {
    return (
      <div className="min-h-screen bg-background text-foreground" style={{ background: 'linear-gradient(135deg, hsl(120, 25%, 96%) 0%, hsl(140, 30%, 94%) 35%, hsl(160, 25%, 95%) 70%, hsl(100, 20%, 96%) 100%)' }}>
        <ProfileView profile={profile} setProfile={setProfile} onBack={() => setView('chat')} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ background: 'linear-gradient(135deg, hsl(120, 25%, 96%) 0%, hsl(140, 30%, 94%) 35%, hsl(160, 25%, 95%) 70%, hsl(100, 20%, 96%) 100%)' }}>

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/60 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shadow-sm">
              <FaHeartbeat className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground leading-none">Seva Health</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Your health companion</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="sample-toggle" className="text-[10px] text-muted-foreground cursor-pointer">Sample</Label>
              <Switch id="sample-toggle" checked={showSample} onCheckedChange={setShowSample} className="scale-75" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLanguage((l) => l === 'EN' ? 'TE' : 'EN')} className="rounded-xl h-8 px-2 text-xs">
              <FaGlobe className="w-3 h-3 mr-1" />{language}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setView('profile')} className="rounded-xl h-8 w-8 p-0">
              <FaUserCircle className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </header>

      {/* QUICK ACTIONS */}
      <div className="bg-card/40 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-2xl mx-auto w-full overflow-x-auto">
          <div className="flex gap-2 px-4 py-3 min-w-max">
            {QUICK_ACTIONS.map((a, idx) => {
              const Icon = a.icon
              return (
                <button key={idx} onClick={() => sendMessage(a.message)} disabled={isLoading} className={'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-medium transition-all whitespace-nowrap disabled:opacity-50 ' + a.color}>
                  <Icon className="w-3 h-3" />{a.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
        {messages.length === 0 && !isLoading ? (
          <WelcomeCard onAction={sendMessage} />
        ) : (
          <div className="py-4 space-y-1">
            {messages.map((msg) =>
              msg.role === 'user' ? <UserBubble key={msg.id} msg={msg} /> : <AgentBubble key={msg.id} msg={msg} onSend={sendMessage} />
            )}
            {isLoading && <TypingIndicator />}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* AGENT STATUS */}
      <div className="max-w-2xl mx-auto w-full px-4 py-2">
        <Card className="bg-card/60 backdrop-blur-sm border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FaRobot className="w-3 h-3" />
              <span className="font-medium">{AGENT_NAME}</span>
              <div className="flex-1" />
              {activeAgent === AGENT_ID ? (
                <div className="flex items-center gap-1.5">
                  <FaCircle className="w-2 h-2 text-amber-500 animate-pulse" />
                  <span className="text-amber-600 font-medium">Processing</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <FaCircle className="w-2 h-2 text-primary" />
                  <span className="text-primary font-medium">Ready</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* INPUT BAR */}
      <div className="sticky bottom-0 bg-card/80 backdrop-blur-md border-t border-border/60">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto w-full px-4 py-3">
          <div className="flex items-center gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={language === 'EN' ? 'Type your message...' : 'Type your message...'}
              className="flex-1 rounded-xl bg-background/80 border-border/60 text-sm h-11"
              disabled={isLoading}
            />
            <Button type="submit" size="sm" disabled={isLoading || !inputValue.trim()} className="rounded-xl h-11 w-11 p-0 flex-shrink-0">
              <FaPaperPlane className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
