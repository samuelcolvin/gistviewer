addEventListener('fetch', e => e.respondWith(handle(e.request)))

const instructions = `
<h1>gistviewer</h1>
<p>
  Render HTML files from gists.
</p>
<form method="GET">
  <input type="text" name="gist-id" placeholder="Gist ID"/>
  <input type="text" name="file-name" placeholder="file name (optional)"/>
  <input type="submit" value="view">
</form>
`

async function handle(request) {
  const url = new URL(request.url)
  const gist_id = url.searchParams.get('gist-id')
  if (!gist_id) {
    return new Response(instructions, {headers: {'content-type': 'text/html'}})
  }
  const file_name = url.searchParams.get('file-name')
  try {
    content = await get_html(gist_id, file_name, request)
    return new Response(content, {headers: {'content-type': 'text/html'}})
  } catch (e) {
    console.error('error handling request:', request)
    console.error('error:', e)
    return new Response(`\nError occurred:\n\n${e.message}\n${e.stack}\n`, {status: 500})
  }
}

async function get_html(gist_id, file_name, request) {
  console.log('gist_id:', gist_id)
  const r = await fetch(`https://api.github.com/gists/${gist_id}`, request)
  console.log('response:', r)
  if (r.status !== 200) {
    const body = await r.text()
    throw Error(`Error getting gist ${gist_id}, response status: ${r.status} response body:\n${body}`)
  }
  const data = await r.json()

  console.log('file_name:', file_name)
  console.log('response data:', data)

  const index_file = data.files['index.html']
  if (!file_name && index_file) {
    return index_file.content
  }

  for (let file of Object.values(data.files)) {
    if (!file_name && file.filename.endsWith('.html')) {
      return file.content
    } else if (file_name === file.filename) {
      return file.content
    }
  }
  throw Error(`unable to find html file in: ${Object.keys(data.files)}`)
}