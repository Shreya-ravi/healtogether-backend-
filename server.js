const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())

const patients = []
const doctorQueue = []
const doctorSessions = []

const remedyLibrary = [
  {
    disease: 'fever',
    remedy_name: 'Tulsi Ginger Tea',
    description: 'A warm herbal tea that may help provide comfort during mild fever and tiredness.',
    doctor_verified: 1,
    tags: ['Ayurveda', 'Home Remedy', 'Popular'],
  },
  {
    disease: 'cold',
    remedy_name: 'Steam Inhalation',
    description: 'Steam inhalation may help reduce nasal congestion and support easier breathing.',
    doctor_verified: 1,
    tags: ['Fast Relief', 'Home Remedy'],
  },
  {
    disease: 'cough',
    remedy_name: 'Honey Lemon Drink',
    description: 'Warm honey lemon drink may help soothe throat irritation and dry cough.',
    doctor_verified: 1,
    tags: ['Home Remedy', 'Supportive Care'],
  },
  {
    disease: 'headache',
    remedy_name: 'Rest and Hydration',
    description: 'Proper rest, hydration, and reduced strain may support recovery from mild headache.',
    doctor_verified: 1,
    tags: ['Supportive Care'],
  },
  {
    disease: 'stomach-pain',
    remedy_name: 'Jeera Water',
    description: 'Warm jeera water may help provide comfort for mild digestion-related stomach pain.',
    doctor_verified: 0,
    tags: ['Ayurveda', 'Home Remedy'],
  },
  {
    disease: 'cold',
    remedy_name: 'Warm Salt Water Gargle',
    description: 'Salt water gargling may help soothe throat discomfort related to cold symptoms.',
    doctor_verified: 1,
    tags: ['Home Remedy'],
  },
]

function normalizeSymptoms(symptoms = []) {
  return symptoms
    .filter(Boolean)
    .map((item) => String(item).trim().toLowerCase())
}

function buildRemedies(symptoms = []) {
  const normalized = normalizeSymptoms(symptoms)

  const matched = remedyLibrary
    .filter((item) => normalized.includes(item.disease))
    .map((item, index) => ({
      id: `${item.disease}-${index + 1}`,
      disease: item.disease,
      remedy_name: item.remedy_name,
      description: item.description,
      doctor_verified: item.doctor_verified,
      avg_rating: item.doctor_verified ? 4.4 : 4.0,
      review_count: item.doctor_verified ? 12 : 7,
      opinion: 'Community users found this helpful for supportive care.',
      tags: item.tags,
      trust_score: item.doctor_verified ? 86 : 70,
      verified_label: item.doctor_verified ? 'Admin Approved' : 'Community Shared',
      disclaimer: 'This is general wellness support and not a medical diagnosis.',
    }))

  if (matched.length) {
    return matched
  }

  return [
    {
      id: 'general-1',
      disease: 'general',
      remedy_name: 'Rest and Fluids',
      description: 'Adequate rest, hydration, and light food may help support recovery for mild symptoms.',
      doctor_verified: 1,
      avg_rating: 4.1,
      review_count: 9,
      opinion: 'A safe first step for general supportive care.',
      tags: ['Supportive Care'],
      trust_score: 74,
      verified_label: 'Admin Approved',
      disclaimer: 'This is general wellness support and not a medical diagnosis.',
    },
  ]
}

app.get('/', (req, res) => {
  res.json({
    message: 'Heal Together backend is running',
    api: [
      '/api/add-patient',
      '/api/get-remedies',
      '/api/auth/doctor-portal-login',
      '/api/doctor-remedies',
      '/api/doctor-patients',
      '/api/doctor-approve-remedy',
    ],
  })
})

function createDoctorQueueItems(patient, remedies) {
  return remedies.map((remedy, index) => ({
    queue_id: `queue-${Date.now()}-${index + 1}-${Math.random().toString(36).slice(2, 7)}`,
    patient_name: patient.name,
    patient_age: patient.age,
    patient_dob: patient.dob,
    patient_symptoms: patient.diseases || [],
    patient_duration: patient.duration || '',
    patient_notes: patient.notes || '',
    remedy_name: remedy.remedy_name,
    description: remedy.description,
    tags: remedy.tags || [],
    doctor_status: 'pending',
    doctor_note: '',
    reviewed_by: '',
    reviewed_at: '',
    created_at: new Date().toISOString(),
  }))
}

function handleAddPatient(req, res) {
  const { name, age, dob, diseases, duration, notes, symptomSeverity } = req.body || {}
  const normalizedSymptoms = normalizeSymptoms(Array.isArray(diseases) ? diseases : [])

  if (!String(name || '').trim() || !String(age || '').trim() || !String(dob || '').trim() || !normalizedSymptoms.length) {
    return res.status(400).json({
      message: 'Name, age, DOB, and at least one symptom are required.',
    })
  }

  const patient = {
    id: patients.length + 1,
    name: String(name).trim(),
    age: String(age).trim(),
    dob: String(dob).trim(),
    diseases: normalizedSymptoms,
    duration: String(duration || '').trim(),
    notes: String(notes || '').trim(),
    symptomSeverity: symptomSeverity || {},
    created_at: new Date().toISOString(),
  }

  patients.push(patient)
  console.log('Patient saved:', patient)

  return res.status(201).json({
    message: 'Patient added successfully.',
    patient,
  })
}

function handleGetRemedies(req, res) {
  const { diseases, patient } = req.body || {}
  const normalizedSymptoms = normalizeSymptoms(Array.isArray(diseases) ? diseases : [])

  if (!normalizedSymptoms.length) {
    return res.status(400).json({
      message: 'At least one symptom is required.',
    })
  }

  const remedies = buildRemedies(normalizedSymptoms)
  console.log('Remedies requested for:', normalizedSymptoms)

  if (patient && String(patient.name || '').trim()) {
    const queueItems = createDoctorQueueItems(
      {
        name: String(patient.name || '').trim(),
        age: String(patient.age || '').trim(),
        dob: String(patient.dob || '').trim(),
        diseases: Array.isArray(patient.diseases) ? patient.diseases : normalizedSymptoms,
        duration: String(patient.duration || '').trim(),
        notes: String(patient.notes || '').trim(),
      },
      remedies,
    )

    doctorQueue.unshift(...queueItems)
  }

  return res.json(remedies)
}

function handleDoctorLogin(req, res) {
  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '').trim()

  if (!username || !password) {
    return res.status(400).json({
      message: 'Doctor username and password are required.',
    })
  }

  if (!username.toLowerCase().startsWith('dr ')) {
    return res.status(400).json({
      message: 'Doctor username must start with dr.',
    })
  }

  if (password !== '123') {
    return res.status(401).json({
      message: 'Invalid doctor password.',
    })
  }

  const session = {
    account_id: `doctor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    display_name: username,
    role: 'doctor',
    created_at: new Date().toISOString(),
  }

  doctorSessions.unshift(session)

  return res.json({
    message: 'Doctor login successful.',
    user: session,
  })
}

function handleDoctorRemedies(req, res) {
  return res.json(doctorQueue)
}

function handleDoctorPatients(req, res) {
  return res.json(
    [...patients].sort((left, right) => new Date(right.created_at) - new Date(left.created_at)),
  )
}

function handleDoctorApproveRemedy(req, res) {
  const queueId = String(req.body?.queue_id || '').trim()
  const remedyName = String(req.body?.remedy_name || '').trim()
  const status = String(req.body?.status || '').trim().toLowerCase()
  const doctorName = String(req.body?.doctor_name || '').trim() || 'Doctor'

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      message: 'Status must be approved or rejected.',
    })
  }

  const targetIndex = doctorQueue.findIndex(
    (item) => item.queue_id === queueId || item.remedy_name === remedyName,
  )

  if (targetIndex === -1) {
    return res.status(404).json({
      message: 'Doctor queue item not found.',
    })
  }

  doctorQueue[targetIndex] = {
    ...doctorQueue[targetIndex],
    doctor_status: status,
    doctor_note: status === 'approved' ? 'Safe to use' : 'Needs review',
    reviewed_by: doctorName,
    reviewed_at: new Date().toISOString(),
  }

  return res.json({
    message: `Remedy ${status}.`,
    item: doctorQueue[targetIndex],
  })
}

app.post('/api/add-patient', handleAddPatient)
app.post('/api/get-remedies', handleGetRemedies)
app.post('/api/auth/doctor-portal-login', handleDoctorLogin)
app.get('/api/doctor-remedies', handleDoctorRemedies)
app.get('/api/doctor-patients', handleDoctorPatients)
app.post('/api/doctor-approve-remedy', handleDoctorApproveRemedy)

// Backward-compatible aliases for any older frontend code still using non-/api endpoints.
app.post('/add-patient', handleAddPatient)
app.post('/get-remedies', handleGetRemedies)
app.post('/auth/doctor-portal-login', handleDoctorLogin)
app.get('/doctor-remedies', handleDoctorRemedies)
app.get('/doctor-patients', handleDoctorPatients)
app.post('/doctor-approve-remedy', handleDoctorApproveRemedy)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
