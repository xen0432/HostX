const axios = require('axios');
const FormData = require('form-data');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, token, type, html, zip, framework, buildCommand, outputDirectory } = req.body;

  if (!name || !token) {
    return res.status(400).json({ error: 'Project name and Vercel token required' });
  }

  if (!token.startsWith('vcp_')) {
    return res.status(400).json({ error: 'Invalid token format. Token should start with "vcp_"' });
  }

  try {
    let deployPayload = {
      name: name,
      public: true,
      framework: framework || null,
      buildCommand: buildCommand || null,
      outputDirectory: outputDirectory || null
    };

    let result;

    if (type === 'html') {
      const files = {
        'index.html': html
      };
      
      const response = await axios.post('https://api.vercel.com/v13/deployments', {
        ...deployPayload,
        files: files
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });
      result = response.data;
    } else if (type === 'folder') {
      const formData = new FormData();
      const zipBuffer = Buffer.from(zip, 'base64');
      formData.append('file', zipBuffer, { filename: 'project.zip' });
      formData.append('name', name);
      formData.append('public', 'true');
      if (framework) formData.append('framework', framework);
      if (buildCommand) formData.append('buildCommand', buildCommand);
      if (outputDirectory) formData.append('outputDirectory', outputDirectory);

      const response = await axios.post('https://api.vercel.com/v13/deployments', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders()
        },
        timeout: 120000
      });
      result = response.data;
    } else {
      return res.status(400).json({ error: 'Invalid deployment type' });
    }

    res.status(200).json({
      success: true,
      project: result.name || name,
      url: result.url || null,
      deploymentId: result.id || null,
      inspectorUrl: result.inspectorUrl || null
    });
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message || 'Deployment failed';
    res.status(500).json({ error: errMsg });
  }
};