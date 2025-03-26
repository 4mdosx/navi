'use client'
import { Card, CardContent } from '@/components/ui/card'

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

export default function GermanLettersPage() {
  const standardLetters = 'abcdefghijklmnopqrstuvwxyz'.split('')
  const specialLetters = ['ä', 'ö', 'ü', 'ß']
  const allLetters = [...standardLetters, ...specialLetters]

  const speak = (letter: string) => {
    if (!window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(
      code[letter as keyof typeof code]
    )
    utterance.voice =
      window.speechSynthesis
        .getVoices()
        .find((voice) => voice.lang.startsWith('de')) ?? null
    utterance.lang = 'de'
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">German Letters</h1>
        <div className="mb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {allLetters.map((letter, index) => (
              <Card
                onClick={() => speak(letter)}
                key={letter}
                className="overflow-hidden border border-border/50 shadow-sm cursor-pointer"
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
                  <div className="text-xs text-muted-foreground capitalize">
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
            The three umlauted vowels (ä, ö, ü) can be written as &quot;ae&quot;,
            &quot;oe&quot;, and &quot;ue&quot; respectively when the umlauts are
            not available. The letter ß (called Eszett or scharfes S) can be
            written as &quot;ss&quot;.
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
