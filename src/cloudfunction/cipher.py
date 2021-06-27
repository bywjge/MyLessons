from collections import Counter
import random, math
guessWord = ['the', 'is', 'what', 'to']

#计算最大公约数
def hcf(x):
  for i in reversed(range(1,min(x) + 1)):
    if len(list(filter(lambda j: j%i!=0,x))) == 0:
      return i

# 判断e是否在arr内
def inArray(e, arr):
  i = -1
  try:
    i = arr.index(e)
  except:
    pass
  return i

# 按值的奇偶保留dict内的元素
def pick(dict, mod):
  newDict = {}
  for k in dict:
    if (dict[k] % 2 == mod):
      newDict[k] = dict[k]
  return newDict

# 分析词频和间隔
# return: keyLength, 1 Letter In key and its position
def wordFreq(text, words):
  text = text.lower()
  s = min([len(w) for w in words])
  e = max([len(w) for w in words])
  counters = [None for i in range(e + 1)]
  for g in range(s, e + 1):
    freq = Counter([text[i:i+g] for i in range(len(text) - g + 1)])
    counters[g] = freq.most_common()

  gaps = [None for i in range(e + 1)]

  E = 0
  O = 0
  for lng, freqWord in enumerate(counters):
    if (freqWord == None):
      continue

    words = freqWord[:5]
    t = [text[i:i+lng] for i in range(len(text) - lng + 1)]
    indexDict = {}
    gapDict = {}

    topFreqWords = [w for w, f in counters[lng][:5]]
    for i, gram in enumerate(t):
      if (gram in gapDict or inArray(gram, topFreqWords) == -1):
        continue
      if (gram in indexDict):
        gap = i - indexDict[gram]
        gapDict[gram] = gap
        # 词语间隔的奇偶统计
        if (gap % 2 == 0):
          E = E + 1
        else:
          O = O + 1
      indexDict[gram] = i
    gaps[lng] = gapDict

  # print(counters)
  # 看词语的出现间隔奇数还是偶数多，选择多的保留
  _lt = []
  for i, g in enumerate(gaps):
    if (g == None):
      continue
    if (E >= 0):
      gaps[i] = pick(g, 0)
    else:
      gaps[i] = pick(g, 1)

  for i, g in enumerate(gaps):
    if (g == None or g == {}):
      continue
    h = hcf([g[k] for k in g])
    _lt.append(h)
    # print(f"for any word length = {i}, key length probably = {h}")

  keyLength = max(_lt,key = _lt.count)
  print(f" ** probably key length = {keyLength}")
  if (len(gaps[keyLength]) == 0):
    return {'length': keyLength, 'letter': [None, None]}
  # analyse letter 's'

  sIn = -1
  sMap = ''
  sFrom = 2
  for x in (sFrom, len(counters) - 2):
    if (counters[x + 1] == None):
      break
    A = [w for w, f in counters[x + 1]][:5]
    WordPosition = {text[i:i+x+1]:i for i in range(len(text) - x)}
    B = [w for w, f in counters[x]][:5]
    print(A, B)
    for word in A:
      w = word[:x]
      sMap = word[x]
      i = 0
      if (inArray(w, B) == -1):
        continue
      sIn = (WordPosition[word] + x) % keyLength
      print(f"s is on {sIn + 1} of key")
      print(f"s convert to {sMap}")
      return {'length': keyLength, 'letter': [getKey(sMap, 's'), sIn]}


  return {'length': keyLength, 'letter': [getKey(sMap, 's'), sIn]}

def move(text):
  for offset in range(26):
    newText = ''
    for t in text:
      newText += chr((ord(t) + offset - ord('A')) % 26 + ord('A'))
    yield newText

def getKey(after, before):
  return chr((ord(after) - ord(before) + 26) % 26 + ord('A'))

print("cipher decode~")

cipherText = "XNVCCIGBTUYVNXVPUCPEANGYRIACILHMIUFOGCRCDZVXUYEOCWRCTUPRSYCOCXRXIOCYCCGCELRNTWRCHIEKCXRKRBFSBJYOXHVDHYYPXZNPIYENDCAQHIBXTMVWEFLUCIPUHIHDPFYDWYPOCNEKACAPTLRXRYFKCXCBTMRXIMBXTMNESCRXRYJSIBGRTMGKGNVXVJBSCNNXSNUORIAMAOFSDHBXTGNIELBNJWRKHNNBIFVXVNUYJAUZDMFSQFLKBYEOILVMXIHCTZSORN"
# cipherText = "IRGOMNATSVIRAOGLERONNNDOPRNITROLIHVAUSRSNSHYDLIEUTGTONSFODTHRAIAWHGAKDOHTPNTDDPHEIBGYLOTDUEDOIQRYSNSEWIOCFITSYNRETSLONESDFNFUNOSHTLYFUYYNOMISRDFMTMIESONDEONKILEOCEIPOACAEOOONAMETHLRIOEAEYMLNENESSAAHFOLFAEHEENNPHEOIIALIYEOHIGHANSELODUOIRRALSUEGATUUYANHTONELPFAREDCGIFNESESYANFGAEDCEWPGUOOIATAE"
o = wordFreq(cipherText, guessWord)
lng = o['length']
le = o['letter'][0]
po = o['letter'][1]

times = 0
doneTimes = 0
usedKey = []
while(times < 999999 and doneTimes < 2):
  key = random.sample('zyxwvutsrqponmlkjihgfedcba',lng)
  if (le != None):
    key[po] = le
  key = ''.join(key).upper()
  # print(key)
  if (inArray(key, usedKey) != -1):
    continue
  usedKey.append(key)
  times += 1
  plainText = ''
  for i, c in enumerate(cipherText):
    t = getKey(c, key[i % lng])
    plainText += t

  for text in move(plainText):
    # print(text)
    # input()
    if (plainText.count('THE') > 2):
      doneTimes += 1
      print('KEY:', key)
      print('RESULT:', plainText)
      print()
      break