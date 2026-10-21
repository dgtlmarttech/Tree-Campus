import 'dotenv/config';

async function testSingle() {
  const token = (process.env.ZEPTO_TOKEN || '').trim();
  const tokenRaw = token.replace(/^(Zoho-enczapikey|Zoho-enczpttoken|SendMail-Token)\s+/i, '').trim();

  // Test both with Zoho-enczpttoken and Zoho-enczapikey
  for (const prefix of ['Zoho-enczpttoken', 'Zoho-enczapikey', 'SendMail-Token']) {
    for (const host of ['api.zeptomail.com', 'api.zeptomail.in']) {
      const url = `https://${host}/v1.1/email`;
      const authHeader = `${prefix} ${tokenRaw}`;

      console.log(`\nTesting ${url} with ${prefix}...`);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            from: {
              address: "partner@creatorsxchange.com",
              name: "Tree Campus"
            },
            to: [
              {
                email_address: {
                  address: "vishx998@gmail.com",
                  name: "Vishal"
                }
              }
            ],
            subject: "Welcome to Tree Campus App!",
            htmlbody: "<div>Hello from Tree Campus</div>"
          })
        });

        const status = res.status;
        const text = await res.text();
        console.log(`Status: ${status} | Body: ${text}`);
      } catch (e) {
        console.error('Error:', e.message);
      }
    }
  }
}

testSingle();
