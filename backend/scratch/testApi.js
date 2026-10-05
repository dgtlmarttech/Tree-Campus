import axios from 'axios';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0YWJjMTIzIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzkxMTgwMzYyLCJleHAiOjE3OTEyNjY3NjJ9.Uuw2VG_RLjypuC8W-cNmHZasXbXj1CCIxuHH8a0HQW8';

async function test() {
  try {
    const res = await axios.post('https://api.treecampus.in/api/admin/day-notifications/send-bulk', {
      startDay: 1, endDay: 1, notificationType: 'engagement'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}

test();
