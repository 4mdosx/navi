'use client'
import { Card, CardContent } from '@/components/ui/card'
import { useEffect, useRef, useState } from 'react'
import { Howl } from 'howler'

const IPAS = {
  a: '/ʔaː/',
  ä: '/ʔɛː/',
  b: '/beː/',
  c: '/t͡seː/',
  d: '/deː/',
  e: '/ʔeː/',
  f: '/ʔɛf/',
  g: '/ɡeː/',
  h: '/haː/',
  i: '/ʔiː/',
  j: '/ʤeː/',
  k: '/kaː/',
  l: '/ʔɛl/',
  m: '/ʔɛm/',
  n: '/ʔɛn/',
  o: '/ʔoː/',
  ö: '/ʔøː/',
  p: '/peː/',
  q: '/keː/',
  r: '/ʔɛʁ/',
  s: '/ʔɛs/',
  ß: '/ɛsˈt͡sɛt/',
  t: '/teː/',
  u: '/ʔuː/',
  ü: '/ʔyː/',
  v: '/faʊ̯/',
  w: '/veː/',
  x: '/ʔɪks/',
  y: '/ˈʔʏpsilɔn/',
  z: '/t͡sɛt/',
}

const code = {
  a: 'anton',
  ä: 'ärger',
  b: 'berta',
  c: 'cäsar',
  d: 'dora',
  e: 'emil',
  f: 'friedrich',
  g: 'gustav',
  h: 'heinrich',
  i: 'ida',
  j: 'julius',
  k: 'kaufmann',
  l: 'ludwig',
  m: 'martha',
  n: 'nordpol',
  o: 'otto',
  ö: 'ökonom',
  p: 'paula',
  q: 'quelle',
  r: 'richard',
  s: 'scharfes',
  t: 'theodor',
  u: 'ulrich',
  ü: 'übermut',
  v: 'viktor',
  w: 'wilhelm',
  x: 'xanthippe',
  y: 'ypsilon',
  z: 'zacharias',
  sch: 'schule',
  ß: 'groß',
}

function toRomanNumber(number: number) {
  // Number to Roman Numerals Conversion
  const roman = [
    'M',
    'CM',
    'D',
    'CD',
    'C',
    'XC',
    'L',
    'XL',
    'X',
    'IX',
    'V',
    'IV',
    'I',
  ]
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  let result = ''
  for (let i = 0; i < roman.length; i++) {
    while (number >= values[i]) {
      number -= values[i]
      result += roman[i]
    }
  }
  return result
}


async function speak(content: string) {
  if (!window.speechSynthesis) return
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(content)
    utterance.voice = window.speechSynthesis.getVoices().find((voice) => voice.lang.startsWith('de')) ?? null
    utterance.lang = 'de'
    utterance.onend = () => {
      setTimeout(() => {
        resolve(null)
      }, 200)
    }
    window.speechSynthesis.speak(utterance)
  })
}

class Sound {
  private sound: Howl | null = null

  constructor() {
    this.sound = new Howl({
      src: ['/sounds/German_alphabet.ogg'],
      sprite: {
        a: [0, 1000], // start, duration
        b: [1000, 1000],
        c: [2000, 1000],
        d: [3000, 1000],
        e: [4000, 1000],
        f: [5000, 1000],
        g: [6000, 1000],
        h: [7000, 1000],
        i: [8000, 1000],
        j: [9000, 1000],
        k: [10000, 1000],
        l: [11000, 1000],
        m: [12000, 1000],
        n: [13000, 1000],
        o: [14000, 1000],
        p: [15000, 1000],
        q: [16000, 1000],
        r: [17000, 1000],
        s: [18000, 1000],
        t: [19000, 1000],
        u: [20000, 1000],
        v: [21000, 1000],
        w: [22000, 1000],
        x: [23000, 1000],
        y: [24000, 1000],
        z: [25000, 1000],
        sch: [26000, 1000],
        ß: [27000, 1000],
      },
    })
  }

  play(script: string) {
    return new Promise((resolve) => {
      this.sound?.play(script)
      setTimeout(() => {
        resolve(null)
      }, 1000)
    })
  }
}

export default function GermanLettersPage() {
  const standardLetters = 'abcdefghijklmnopqrstuvwxyz'.split('')
  const specialLetters = ['ä', 'ö', 'ü', 'ß']
  const allLetters = [...standardLetters, ...specialLetters]
  const queue = useRef<string[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const sound = useRef<Sound | null>(null)
  useEffect(() => {
    if (current) {
      sound.current?.play(current).then(() => {
        if (queue.current.length > 0) {
          setCurrent(queue.current[0])
          queue.current = queue.current.slice(1)
        } else {
          setCurrent(null)
        }
      })
    }
  })
  useEffect(() => {
    sound.current = new Sound()
  }, [])

  function play(letters: string[]) {
    queue.current = letters
    setCurrent(null) // reset current
    setCurrent(queue.current[0])
    queue.current = queue.current.slice(1)
  }

  function clear() {
    queue.current = []
    setCurrent(null)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-semibold">
            German Letters
          </h1>
          <div className="flex items-center justify-end gap-2">
            { queue.current.length > 1 ? <button onClick={() => clear()} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Stop</button> : null}
            <button
              onClick={() => play(allLetters)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={current !== null}
            >
              Play All
            </button>
          </div>
        </div>
        <div className="mb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {allLetters.map((letter, index) => (
              <Card
                onClick={() => play([letter])}
                key={letter}
                className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer transition-colors ${
                  current === letter
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : ''
                }`}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center relative">
                  <div className="text-4xl font-light mb-2 mt-2">
                    {letter === 'ß' ? 'ẞ' : letter.toUpperCase()}
                    {letter}
                  </div>
                  <div className="text-xs text-muted-foreground absolute top-2 left-2">
                    {index < 26 ? toRomanNumber(index + 1) : ''}
                    {letter === 'ß'
                      ? 'Eszett'
                      : letter === 'ä'
                      ? 'A-umlaut'
                      : letter === 'ö'
                      ? 'O-umlaut'
                      : letter === 'ü'
                      ? 'U-umlaut'
                      : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {IPAS[letter as keyof typeof IPAS]}
                  </div>
                  <div className="text-md mt-2 text-muted-foreground capitalize" onClick={(e) => {
                    e.stopPropagation()
                    speak(code[letter as keyof typeof code])
                  }}>
                    {code[letter as keyof typeof code]}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          <h2>About the German Alphabet</h2>
          <p>
            The German alphabet consists of the twenty-six letters of the ISO
            basic Latin alphabet plus four special characters: ä, ö, ü, and ß.
          </p>
          <p>
            The three umlauted vowels (ä, ö, ü) can be written as
            &quot;ae&quot;, &quot;oe&quot;, and &quot;ue&quot; respectively when
            the umlauts are not available. The letter ß (called Eszett or
            scharfes S) can be written as &quot;ss&quot;.
          </p>
          <p>
            In the German phonetic alphabet, these special characters have
            distinct pronunciations that are important for proper German speech.
          </p>
        </div>
      </div>
    </div>
  )
}
