'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

// ============================================================
// CONSTANTS
// ============================================================
const AGENT_ID = '69996ce29f3636d6dd80984c'
const AGENT_NAME = 'Seva Health Agent'

// ============================================================
// TYPES
// ============================================================
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
  donationHistory: { date: string; requesterCity: string; status: string }[]
}

// ============================================================
// SAMPLE DATA
// ============================================================
const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: 'sample-1',
    role: 'user',
    text: 'I need emergency help',
    timestamp: '10:00 AM',
  },
  {
    id: 'sample-2',
    role: 'agent',
    text: '',
    data: {
      message: 'Here are the emergency numbers you can reach out to immediately. Please stay calm and call the nearest service.',
      intent: 'emergency',
      emergency_numbers: [
        { name: 'Ambulance', number: '108', description: 'Emergency ambulance service available 24/7 across India' },
        { name: 'Police', number: '100', description: 'Police emergency helpline' },
        { name: 'Women Helpline', number: '181', description: 'Women in distress helpline' },
      ],
      hospitals: [],
      donors: [],
      schemes: [],
      organ_donation_info: { awareness: '', pledge_process: '', official_link: '' },
      consent_required: false,
      follow_up: 'Would you like me to find the nearest hospital to your location?',
    },
    timestamp: '10:01 AM',
  },
  {
    id: 'sample-3',
    role: 'user',
    text: 'Find nearby hospitals',
    timestamp: '10:02 AM',
  },
  {
    id: 'sample-4',
    role: 'agent',
    text: '',
    data: {
      message: 'Here are the hospitals near your area. You can call or navigate to any of them.',
      intent: 'hospital_finder',
      emergency_numbers: [],
      hospitals: [
        { name: 'Apollo Hospital', type: 'Multi-Specialty', address: 'Jubilee Hills, Hyderabad', phone: '040-23607777', distance: '2.5 km' },
        { name: 'NIMS Hospital', type: 'Government', address: 'Punjagutta, Hyderabad', phone: '040-23390000', distance: '4.0 km' },
        { name: 'Care Hospital', type: 'Super-Specialty', address: 'Banjara Hills, Hyderabad', phone: '040-30418888', distance: '3.2 km' },
      ],
      donors: [],
      schemes: [],
      organ_donation_info: { awareness: '', pledge_process: '', official_link: '' },
      consent_required: false,
      follow_up: 'Do you need directions to any of these hospitals?',
    },
    timestamp: '10:03 AM',
  },
  {
    id: 'sample-5',
    role: 'user',
    text: 'Tell me about government health schemes',
    timestamp: '10:05 AM',
  },
  {
    id: 'sample-6',
    role: 'agent',
    text: '',
    data: {
      message: 'Here are some government health schemes available for you and your family.',
      intent: 'schemes',
      emergency_numbers: [],
      hospitals: [],
      donors: [],
      schemes: [
        { name: 'Ayushman Bharat (PM-JAY)', eligibility: 'Families listed in SECC database, annual income below 5 lakh', documents: 'Aadhaar Card, Ration Card, Income Certificate', how_to_apply: 'Visit nearest CSC center or Ayushman Mitra at empanelled hospital', link: 'https://pmjay.gov.in' },
        { name: 'Aarogyasri Health Insurance', eligibility: 'Below Poverty Line families in Telangana with white ration card', documents: 'Aarogyasri Card, Aadhaar, White Ration Card', how_to_apply: 'Visit network hospital with Aarogyasri card, treatment is cashless', link: 'https://aarogyasri.telangana.gov.in' },
      ],
      organ_donation_info: { awareness: '', pledge_process: '', official_link: '' },
      consent_required: false,
      follow_up: 'Would you like details about eligibility for any specific scheme?',
    },
    timestamp: '10:06 AM',
  },
]

const SAMPLE_DONOR_PROFILE: DonorProfile = {
  name: 'Ravi Kumar',
  bloodGroup: 'O+',
  city: 'Hyderabad',
  phone: '+91 98765 43210',
  isActive: true,
  donationHistory: [
    { date: '2025-01-15', requesterCity: 'Secunderabad', status: 'Completed' },
    { date: '2024-11-20', requesterCity: 'Hyderabad', status: 'Completed' },
    { date: '2024-08-05', requesterCity: 'Warangal', status: 'Cancelled' },
  ],
}

// ============================================================
// RESPONSE PARSER
// ============================================================
function parseAgentResponse(apiResult: any): SevaHealthResponse {
  const fallback: SevaHealthResponse = {
    message: '',
    intent: 'general',
    emergency_numbers: [],
    hospitals: [],
    donors: [],
    schemes: [],
    organ_donation_info: { awareness: '', pledge_process: '', official_link: '' },
    consent_required: false,
    follow_up: '',
  }

  if (!apiResult) return fallback

  // The callAIAgent returns AIAgentResponse: { success, response: { status, result, message } }
  // The actual structured JSON is in response.result
  let data: any = null

  // Step 1: Navigate to response.result (the primary path)
  if (apiResult?.response?.result) {
    const innerResult = apiResult.response.result
    if (typeof innerResult === 'string') {
      try { data = JSON.parse(innerResult) } catch { data = null }
    } else if (typeof innerResult === 'object') {
      data = innerResult
    }
  }

  // Step 2: If response.result didn't yield data, try response.message
  if (!data && apiResult?.response?.message) {
    const msg = apiResult.response.message
    if (typeof msg === 'string' && msg.trim().startsWith('{')) {
      try { data = JSON.parse(msg) } catch { data = null }
    }
  }

  // Step 3: Try response directly as the data object
  if (!data && typeof apiResult?.response === 'object' && apiResult.response !== null) {
    if (apiResult.response.intent || apiResult.response.emergency_numbers) {
      data = apiResult.response
    }
  }

  // Step 4: Try apiResult directly (if it has agent fields)
  if (!data && (apiResult?.intent || apiResult?.emergency_numbers)) {
    data = apiResult
  }

  // Step 5: Try raw_response field
  if (!data && apiResult?.raw_response) {
    if (typeof apiResult.raw_response === 'string') {
      try { data = JSON.parse(apiResult.raw_response) } catch { data = null }
    }
  }

  // Step 6: If data.message itself contains JSON, parse it
  if (data?.message && typeof data.message === 'string' && data.message.trim().startsWith('{')) {
    try {
      const innerParsed = JSON.parse(data.message)
      if (innerParsed?.intent || innerParsed?.message) {
        data = innerParsed
      }
    } catch { /* keep data as is */ }
  }

  // Step 7: If nothing worked, use the plain text message as fallback
  if (!data) {
    const plainText = apiResult?.response?.message || apiResult?.response?.result?.text || ''
    return { ...fallback, message: typeof plainText === 'string' ? plainText : JSON.stringify(plainText) }
  }

  // If data is still a string, try parsing once more
  if (typeof data === 'string') {
    try { data = JSON.parse(data) } catch {
      return { ...fallback, message: data }
    }
  }

  return {
    message: data?.message || data?.text || '',
    intent: data?.intent || 'general',
    emergency_numbers: Array.isArray(data?.emergency_numbers) ? data.emergency_numbers : [],
    hospitals: Array.isArray(data?.hospitals) ? data.hospitals : [],
    donors: Array.isArray(data?.donors) ? data.donors : [],
    schemes: Array.isArray(data?.schemes) ? data.schemes : [],
    organ_donation_info: data?.organ_donation_info && typeof data.organ_donation_info === 'object'
      ? {
          awareness: data.organ_donation_info.awareness || '',
          pledge_process: data.organ_donation_info.pledge_process || '',
          official_link: data.organ_donation_info.official_link || '',
        }
      : { awareness: '', pledge_process: '', official_link: '' },
    consent_required: Boolean(data?.consent_required),
    follow_up: data?.follow_up || '',
  }
}

// ============================================================
// MARKDOWN RENDERER
// ============================================================
function formatInline(text: string) {
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

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

// ============================================================
// ERROR BOUNDARY
// ============================================================
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================
// TYPING INDICATOR
// ============================================================
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FaHeartbeat className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0.15s' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// WELCOME CARD
// ============================================================
function WelcomeCard({ onQuickAction }: { onQuickAction: (msg: string) => void }) {
  return (
    <div className="px-4 py-6">
      <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 border-primary/20 shadow-md backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <FaHeartbeat className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">Welcome to Seva Health</h2>
              <p className="text-sm text-muted-foreground">Your health companion for emergencies, hospitals, blood services, and more</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="leading-relaxed">I can help you with:</p>
            <ul className="space-y-1.5 ml-1">
              <li className="flex items-center gap-2"><FaExclamationTriangle className="w-3 h-3 text-destructive flex-shrink-0" /> Emergency numbers and immediate help</li>
              <li className="flex items-center gap-2"><FaHospital className="w-3 h-3 text-primary flex-shrink-0" /> Finding nearby hospitals</li>
              <li className="flex items-center gap-2"><FaTint className="w-3 h-3 text-destructive flex-shrink-0" /> Blood donation and requests</li>
              <li className="flex items-center gap-2"><FaFileAlt className="w-3 h-3 text-accent flex-shrink-0" /> Government health schemes</li>
              <li className="flex items-center gap-2"><FaHeart className="w-3 h-3 text-pink-500 flex-shrink-0" /> Organ donation information</li>
            </ul>
          </div>
          <div className="mt-5">
            <Button
              variant="default"
              size="sm"
              className="rounded-xl"
              onClick={() => onQuickAction('Hello, what can you help me with?')}
            >
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// EMERGENCY BANNER
// ============================================================
function EmergencyBanner({ numbers }: { numbers: EmergencyNumber[] }) {
  if (!Array.isArray(numbers) || numbers.length === 0) return null
  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <FaExclamationTriangle className="w-4 h-4 text-destructive" />
        <span className="text-sm font-semibold text-destructive">Emergency Numbers</span>
      </div>
      <div className="space-y-2">
        {numbers.map((item, idx) => (
          <a
            key={idx}
            href={`tel:${item?.number ?? ''}`}
            className="flex items-center justify-between p-3 bg-background/80 rounded-lg border border-destructive/20 hover:bg-destructive/5 transition-colors"
          >
            <div>
              <div className="text-sm font-medium text-foreground">{item?.name ?? 'Unknown'}</div>
              <div className="text-xs text-muted-foreground">{item?.description ?? ''}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-destructive">{item?.number ?? ''}</span>
              <FaPhone className="w-3 h-3 text-destructive" />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// HOSPITAL CARDS
// ============================================================
function HospitalCards({ hospitals }: { hospitals: Hospital[] }) {
  if (!Array.isArray(hospitals) || hospitals.length === 0) return null
  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2 mb-1">
        <FaHospital className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Nearby Hospitals</span>
      </div>
      {hospitals.map((h, idx) => (
        <Card key={idx} className="bg-background/80 border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">{h?.name ?? 'Unknown Hospital'}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {h?.type && <Badge variant="secondary" className="text-xs">{h.type}</Badge>}
                  {h?.distance && <Badge variant="outline" className="text-xs">{h.distance}</Badge>}
                </div>
              </div>
            </div>
            {h?.address && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground mb-2">
                <FaMapMarkerAlt className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{h.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {h?.phone && (
                <a href={`tel:${h.phone}`} className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
                  <FaPhone className="w-2.5 h-2.5" /> {h.phone}
                </a>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((h?.name ?? '') + ' ' + (h?.address ?? ''))}`}
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

// ============================================================
// DONOR CARDS
// ============================================================
function DonorCards({ donors, onRequestContact }: { donors: Donor[]; onRequestContact: (name: string) => void }) {
  if (!Array.isArray(donors) || donors.length === 0) return null
  return (
    <div className="space-y-2 mt-2">
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
                  <div className="text-sm font-medium text-foreground">{d?.name ?? 'Anonymous'}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    {d?.city && <span>{d.city}</span>}
                    {d?.distance && <span className="text-muted-foreground/60">-</span>}
                    {d?.distance && <span>{d.distance}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className="bg-destructive text-destructive-foreground text-sm font-bold px-3">{d?.blood_group ?? '?'}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-lg h-7"
                  onClick={() => onRequestContact(d?.name ?? 'donor')}
                >
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

// ============================================================
// SCHEME CARDS
// ============================================================
function SchemeCards({ schemes }: { schemes: Scheme[] }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  if (!Array.isArray(schemes) || schemes.length === 0) return null
  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2 mb-1">
        <FaFileAlt className="w-4 h-4 text-accent" />
        <span className="text-sm font-semibold text-foreground">Health Schemes</span>
      </div>
      {schemes.map((s, idx) => (
        <Card key={idx} className="bg-background/80 border-border/60 shadow-sm overflow-hidden">
          <button
            className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            onClick={() => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))}
          >
            <span className="text-sm font-semibold text-foreground pr-2">{s?.name ?? 'Unknown Scheme'}</span>
            {expanded[idx] ? <FaChevronUp className="w-3 h-3 text-muted-foreground flex-shrink-0" /> : <FaChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
          </button>
          {expanded[idx] && (
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <Separator />
              {s?.eligibility && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Eligibility</div>
                  <p className="text-sm text-foreground">{s.eligibility}</p>
                </div>
              )}
              {s?.documents && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Documents Required</div>
                  <p className="text-sm text-foreground">{s.documents}</p>
                </div>
              )}
              {s?.how_to_apply && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">How to Apply</div>
                  <p className="text-sm text-foreground">{s.how_to_apply}</p>
                </div>
              )}
              {s?.link && (
                <a
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <FaExternalLinkAlt className="w-2.5 h-2.5" /> Learn More
                </a>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

// ============================================================
// ORGAN DONATION CARD
// ============================================================
function OrganDonationCard({ info }: { info: OrganDonationInfo }) {
  if (!info?.awareness && !info?.pledge_process && !info?.official_link) return null
  return (
    <Card className="bg-pink-50/50 border-pink-200/50 shadow-sm mt-2">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FaHeart className="w-4 h-4 text-pink-500" />
          <span className="text-sm font-semibold text-foreground">Organ Donation Information</span>
        </div>
        {info?.awareness && (
          <div className="mb-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Awareness</div>
            <div className="text-sm text-foreground leading-relaxed">{renderMarkdown(info.awareness)}</div>
          </div>
        )}
        {info?.pledge_process && (
          <div className="mb-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Pledge Process</div>
            <div className="text-sm text-foreground leading-relaxed">{renderMarkdown(info.pledge_process)}</div>
          </div>
        )}
        {info?.official_link && (
          <a
            href={info.official_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-pink-600 hover:text-pink-700 font-medium transition-colors"
          >
            <FaExternalLinkAlt className="w-2.5 h-2.5" /> Official Website
          </a>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// CONSENT CARD
// ============================================================
function ConsentCard({ onAgree, onCancel }: { onAgree: () => void; onCancel: () => void }) {
  return (
    <Card className="bg-amber-50/50 border-amber-200/50 shadow-sm mt-2">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FaHandHoldingHeart className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-foreground">Consent Required</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          To proceed, we need your consent to share your contact details with potential donors/recipients. Your information will only be used for this specific request.
        </p>
        <div className="flex items-center gap-3">
          <Button size="sm" className="rounded-xl" onClick={onAgree}>
            <FaCheck className="w-3 h-3 mr-1.5" /> I Agree
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={onCancel}>
            <FaBan className="w-3 h-3 mr-1.5" /> Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// AGENT MESSAGE BUBBLE
// ============================================================
function AgentMessage({ msg, onSend }: { msg: ChatMessage; onSend: (text: string) => void }) {
  const data = msg.data

  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <FaHeartbeat className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm backdrop-blur-sm">
          {data?.message ? renderMarkdown(data.message) : msg.text ? renderMarkdown(msg.text) : null}
          {data && (
            <>
              <EmergencyBanner numbers={data.emergency_numbers} />
              <HospitalCards hospitals={data.hospitals} />
              <DonorCards
                donors={data.donors}
                onRequestContact={(name) => onSend(`I would like to request contact details for donor ${name}`)}
              />
              <SchemeCards schemes={data.schemes} />
              <OrganDonationCard info={data.organ_donation_info} />
              {data.consent_required && (
                <ConsentCard
                  onAgree={() => onSend('I agree')}
                  onCancel={() => onSend('I do not consent')}
                />
              )}
              {data.follow_up && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <button
                    onClick={() => onSend(data.follow_up)}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors text-left"
                  >
                    {data.follow_up}
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

// ============================================================
// USER MESSAGE BUBBLE
// ============================================================
function UserMessage({ msg }: { msg: ChatMessage }) {
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

// ============================================================
// QUICK ACTIONS
// ============================================================
const QUICK_ACTIONS = [
  { label: 'Emergency', icon: FaExclamationTriangle, message: 'I need emergency help', color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' },
  { label: 'Hospital', icon: FaHospital, message: 'Find nearby hospitals', color: 'text-primary bg-primary/5 border-primary/20 hover:bg-primary/10' },
  { label: 'Donate Blood', icon: FaTint, message: 'I want to donate blood', color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100' },
  { label: 'Need Blood', icon: FaTint, message: 'I need blood urgently', color: 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100' },
  { label: 'Schemes', icon: FaFileAlt, message: 'Tell me about government health schemes', color: 'text-accent bg-accent/5 border-accent/20 hover:bg-accent/10' },
  { label: 'Organ Donation', icon: FaHeart, message: 'Tell me about organ donation', color: 'text-pink-600 bg-pink-50 border-pink-200 hover:bg-pink-100' },
]

// ============================================================
// DONOR PROFILE VIEW
// ============================================================
function DonorProfileView({ profile, setProfile, onBack }: {
  profile: DonorProfile
  setProfile: React.Dispatch<React.SetStateAction<DonorProfile>>
  onBack: () => void
}) {
  const [showOptOut, setShowOptOut] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 bg-card/80 backdrop-blur-md border-b border-border/60">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-xl">
          <FaArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">Donor Profile</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FaUserCircle className="w-10 h-10 text-primary/60" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{profile.name || 'Your Name'}</h3>
              <Badge className="bg-destructive text-destructive-foreground text-sm font-bold mt-1">{profile.bloodGroup || '?'}</Badge>
            </div>
          </div>

          <Card className="bg-card/80 backdrop-blur-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="donor-name" className="text-xs text-muted-foreground">Full Name</Label>
                <Input
                  id="donor-name"
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 rounded-xl"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <Label htmlFor="donor-blood" className="text-xs text-muted-foreground">Blood Group</Label>
                <Select
                  value={profile.bloodGroup}
                  onValueChange={(val) => setProfile(prev => ({ ...prev, bloodGroup: val }))}
                >
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="donor-city" className="text-xs text-muted-foreground">City</Label>
                <Input
                  id="donor-city"
                  value={profile.city}
                  onChange={(e) => setProfile(prev => ({ ...prev, city: e.target.value }))}
                  className="mt-1 rounded-xl"
                  placeholder="Enter your city"
                />
              </div>
              <div>
                <Label htmlFor="donor-phone" className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  id="donor-phone"
                  value={profile.phone}
                  readOnly
                  className="mt-1 rounded-xl bg-muted/30"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Availability Status</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {profile.isActive ? 'You are visible to blood requesters' : 'You are hidden from blood requests'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{profile.isActive ? 'Active' : 'Paused'}</span>
                  <Switch
                    checked={profile.isActive}
                    onCheckedChange={(checked) => setProfile(prev => ({ ...prev, isActive: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Donation History</CardTitle>
            </CardHeader>
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
                    <Badge variant={h.status === 'Completed' ? 'default' : 'secondary'} className="text-xs">
                      {h.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="pt-2">
            <Button
              variant="destructive"
              className="w-full rounded-xl"
              onClick={() => setShowOptOut(true)}
            >
              <FaBan className="w-3 h-3 mr-2" /> Opt Out of Donor Program
            </Button>
          </div>

          {showOptOut && (
            <Card className="bg-destructive/5 border-destructive/30">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-foreground mb-4">Are you sure you want to opt out? You will no longer receive blood donation requests.</p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="destructive" size="sm" className="rounded-xl" onClick={() => {
                    setProfile(prev => ({ ...prev, isActive: false }))
                    setShowOptOut(false)
                  }}>
                    Yes, Opt Out
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowOptOut(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================
// AGENT STATUS SECTION
// ============================================================
function AgentStatusSection({ activeAgentId }: { activeAgentId: string | null }) {
  return (
    <div className="px-4 py-3">
      <Card className="bg-card/60 backdrop-blur-sm border-border/40">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FaRobot className="w-3 h-3" />
            <span className="font-medium">{AGENT_NAME}</span>
            <div className="flex-1" />
            {activeAgentId === AGENT_ID ? (
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
  )
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function Page() {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [showSampleData, setShowSampleData] = useState(false)
  const [language, setLanguage] = useState<'EN' | 'TE'>('EN')
  const [currentView, setCurrentView] = useState<'chat' | 'profile'>('chat')
  const [sessionId, setSessionId] = useState('')
  const [donorProfile, setDonorProfile] = useState<DonorProfile>({
    name: '',
    bloodGroup: '',
    city: '',
    phone: '+91 XXXXX XXXXX',
    isActive: false,
    donationHistory: [],
  })

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(crypto.randomUUID())
  }, [])

  // Sample data toggle
  useEffect(() => {
    if (showSampleData) {
      setMessages(SAMPLE_MESSAGES)
      setDonorProfile(SAMPLE_DONOR_PROFILE)
    } else {
      setMessages([])
      setDonorProfile({
        name: '',
        bloodGroup: '',
        city: '',
        phone: '+91 XXXXX XXXXX',
        isActive: false,
        donationHistory: [],
      })
    }
  }, [showSampleData])

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Get current timestamp
  const getTimestamp = useCallback(() => {
    const now = new Date()
    return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }, [])

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: getTimestamp(),
    }

    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)
    setActiveAgentId(AGENT_ID)

    try {
      const result = await callAIAgent(text.trim(), AGENT_ID, { session_id: sessionId })
      const parsed = parseAgentResponse(result)

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        text: parsed.message,
        data: parsed,
        timestamp: getTimestamp(),
      }
      setMessages(prev => [...prev, agentMsg])
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'agent',
        text: 'Sorry, something went wrong. Please try again.',
        data: {
          message: 'Sorry, something went wrong. Please try again.',
          intent: 'general',
          emergency_numbers: [],
          hospitals: [],
          donors: [],
          schemes: [],
          organ_donation_info: { awareness: '', pledge_process: '', official_link: '' },
          consent_required: false,
          follow_up: '',
        },
        timestamp: getTimestamp(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
      setActiveAgentId(null)
    }
  }, [isLoading, sessionId, getTimestamp])

  // Handle form submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue)
  }, [inputValue, sendMessage])

  // Displayed messages
  const displayedMessages = messages

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ background: 'linear-gradient(135deg, hsl(120 25% 96%) 0%, hsl(140 30% 94%) 35%, hsl(160 25% 95%) 70%, hsl(100 20% 96%) 100%)' }}>
        {currentView === 'profile' ? (
          <DonorProfileView
            profile={donorProfile}
            setProfile={setDonorProfile}
            onBack={() => setCurrentView('chat')}
          />
        ) : (
          <>
            {/* ========== HEADER ========== */}
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
                  {/* Sample Data Toggle */}
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="sample-toggle" className="text-[10px] text-muted-foreground cursor-pointer">Sample</Label>
                    <Switch
                      id="sample-toggle"
                      checked={showSampleData}
                      onCheckedChange={setShowSampleData}
                      className="scale-75"
                    />
                  </div>
                  {/* Language Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLanguage(prev => prev === 'EN' ? 'TE' : 'EN')}
                    className="rounded-xl h-8 px-2 text-xs"
                  >
                    <FaGlobe className="w-3 h-3 mr-1" />
                    {language}
                  </Button>
                  {/* Profile */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentView('profile')}
                    className="rounded-xl h-8 w-8 p-0"
                  >
                    <FaUserCircle className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </header>

            {/* ========== QUICK ACTIONS ========== */}
            <div className="bg-card/40 backdrop-blur-sm border-b border-border/40">
              <div className="max-w-2xl mx-auto w-full overflow-x-auto">
                <div className="flex gap-2 px-4 py-3 min-w-max">
                  {QUICK_ACTIONS.map((action, idx) => {
                    const Icon = action.icon
                    return (
                      <button
                        key={idx}
                        onClick={() => sendMessage(action.message)}
                        disabled={isLoading}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-medium transition-all duration-200 whitespace-nowrap disabled:opacity-50 ${action.color}`}
                      >
                        <Icon className="w-3 h-3" />
                        {action.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ========== CHAT AREA ========== */}
            <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
              {displayedMessages.length === 0 && !isLoading ? (
                <WelcomeCard onQuickAction={sendMessage} />
              ) : (
                <div className="py-4 space-y-1">
                  {displayedMessages.map((msg) =>
                    msg.role === 'user' ? (
                      <UserMessage key={msg.id} msg={msg} />
                    ) : (
                      <AgentMessage key={msg.id} msg={msg} onSend={sendMessage} />
                    )
                  )}
                  {isLoading && <TypingIndicator />}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* ========== AGENT STATUS ========== */}
            <div className="max-w-2xl mx-auto w-full">
              <AgentStatusSection activeAgentId={activeAgentId} />
            </div>

            {/* ========== INPUT BAR ========== */}
            <div className="sticky bottom-0 bg-card/80 backdrop-blur-md border-t border-border/60">
              <form onSubmit={handleSubmit} className="max-w-2xl mx-auto w-full px-4 py-3">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={language === 'EN' ? 'Type your message...' : 'Type your message...'}
                    className="flex-1 rounded-xl bg-background/80 border-border/60 text-sm h-11"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading || !inputValue.trim()}
                    className="rounded-xl h-11 w-11 p-0 flex-shrink-0"
                  >
                    <FaPaperPlane className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  )
}
