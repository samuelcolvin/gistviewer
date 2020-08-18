addEventListener('fetch', e => e.respondWith(handle(e.request)))

const instructions = `
<h1>gistviewer</h1>
<p>
  Render HTML files from gists.
</p>
<form id="form" method="GET">
  <input id="gist-id" type="text" name="gist-id" placeholder="Gist ID" required/>
  <input id="file-name" type="text" name="file-name" placeholder="file name (optional)"/>
  <input type="submit" value="view">
</form>
<p>
  See 
  <a href="https://github.com/samuelcolvin/gistviewer">github.com/samuelcolvin/gistviewer</a>
  for more details.
</p>
<script>
  document.getElementById('form').addEventListener('submit', function(e) {
    e.preventDefault()
    const gist_id = document.getElementById('gist-id').value
    const file_name = document.getElementById('file-name').value
    if (gist_id) {
      let new_url = 'https://' + window.location.hostname + '/' + gist_id
      if (file_name) {
        new_url += '/' + file_name
      }
      window.location = new_url
    }
  })
</script>
`

async function handle(request) {
  const url = new URL(request.url)
  let pathname = url.pathname.substr(1) || url.searchParams.get('gist-id')
  console.log('pathname:', pathname)
  if (!pathname) {
    return new Response(instructions, {headers: {'content-type': 'text/html'}})
  }
  if (pathname === 'favicon.ico') {
    return fetch('https://scolvin.com/favicon.png', request)
  }
  let gist_id, file_name
  if (pathname.includes('/')) {
    [gist_id, file_name] = pathname.split('/')
  } else {
    gist_id = pathname
    file_name = url.searchParams.get('file-name')
  }

  console.log('gist_id:', gist_id)
  console.log('file_name:', file_name)

  let content
  try {
    content = await get_html(gist_id, file_name, request)
  } catch (e) {
    console.error('error handling request:', request)
    console.error('error:', e)
    return new Response(`\nError occurred:\n\n${e.message}\n`, {status: 500})
  }

  let content_type = 'text/html'
  if (file_name && file_name.endsWith('.json')) {
    content_type = 'application/json'
  }
  return new Response(content, {headers: {'content-type': content_type}})
}

async function get_html(gist_id, file_name, request) {
  const r = await fetch(`https://api.github.com/gists/${gist_id}`, request)
  console.log('response:', r)
  if (r.status !== 200) {
    const body = await r.text()
    throw Error(`Error getting gist ${gist_id}, response status: ${r.status} response body:\n${body}`)
  }
  const data = await r.json()
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
  throw Error(`unable to find html file "${file_name}" in gist, files: [${Object.keys(data.files)}]`)
}
