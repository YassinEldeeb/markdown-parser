import fs from 'fs'
import path from 'path'
import { performance, PerformanceObserver } from 'perf_hooks'

const perfObserver = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(entry)
  })
})

perfObserver.observe({ entryTypes: ['measure'], buffered: true })

performance.mark('start')

// Rules
type headerSizes = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
type objectType = headerSizes | 'p' | 'separator'

const headings = {
  '#': '1',
  '##': '2',
  '###': '3',
  '####': '4',
  '#####': '5',
  '######': '6',
}

// Utils
const allSameChar = (splittedLine: string[], char: string) =>
  splittedLine.every((e) => e === char || e === '') && splittedLine.length > 0

// Todo: *, **, *** should be escaped
const formatText = (text: string) => {
  const boldRegex = new RegExp('\\*\\*', 'g')
  const italicRegex = new RegExp('\\*', 'g')
  const bothRegex = new RegExp('\\*\\*\\*', 'g')

  return text
    .replace(bothRegex, '<b><i>')
    .replace(boldRegex, '<b>')
    .replace(italicRegex, '<i>')
}

const pureMD = fs
  .readFileSync(path.join(__dirname, './sample.md'), 'utf-8')
  .replace(/\r/g, '')

const parsed: { type: objectType; [key: string]: string }[] = []

const linesMD = pureMD.split('\n')
const blackListedLinesIndexes: number[] = []

linesMD.forEach((e, i) => {
  const line = e.trim()

  const splittedLine = line.split('')
  if (splittedLine.length === 0) return

  // Headings (Special Cases)
  const nextLine = linesMD[i + 1]
  const previousLine = linesMD[i - 1]

  const nextSplittedLine = nextLine?.split('')

  if (nextLine) {
    if (allSameChar(nextSplittedLine, '=') && splittedLine.length > 0) {
      parsed.push({
        text: formatText(line),
        type: 'h1',
      })
      blackListedLinesIndexes.push(i + 1)

      return
    } else if (
      allSameChar(nextSplittedLine, '-') &&
      splittedLine.length > 0 &&
      !blackListedLinesIndexes.includes(i)
    ) {
      parsed.push({
        text: formatText(line),
        type: 'h2',
      })
      blackListedLinesIndexes.push(i + 1)

      return
    }
  }

  // Headings
  let headingFound = false
  Object.keys(headings).forEach((e) => {
    const symbol = `${e} `
    if (line.startsWith(symbol)) {
      parsed.push({
        text: formatText(line.replace(symbol, '')),
        type: ('h' + headings[e as keyof typeof headings]) as headerSizes,
      })
      headingFound = true
      return
    }
  })
  if (headingFound) {
    return
  }

  // Separator Line
  if (
    (allSameChar(splittedLine, '-') ||
      allSameChar(splittedLine, '*') ||
      allSameChar(splittedLine, '_')) &&
    splittedLine.length >= 3 &&
    !blackListedLinesIndexes.includes(i)
  ) {
    parsed.push({
      type: 'separator',
    })
    return
  }

  // Paragraph
  if (!blackListedLinesIndexes.includes(i)) {
    // Append paragraph to the previous object If:
    // 1.the last object in parsed is { type: 'p' }
    // 2.there's a previous line
    // 3.the previous line doesn't end with 2 or more spaces
    const previousObj = parsed[parsed.length - 1]

    if (
      previousObj &&
      previousObj.type === 'p' &&
      previousLine.length > 0 &&
      !previousLine.endsWith('  ')
    ) {
      previousObj.text = `${previousObj.text} ${line}`
    } else {
      parsed.push({
        text: formatText(line),
        type: 'p',
      })
    }
  }
})

// Checking Performance
performance.mark('end')
performance.measure('performance', 'start', 'end')

console.log(parsed)

// Writing Output
fs.writeFileSync(
  path.join(__dirname, '../output.json'),
  JSON.stringify(parsed, null, 2)
)
