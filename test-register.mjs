

async function testRegister() {
  const payload = {
    name: "Test Student",
    email: "teststudent_new6@example.com",
    batch_name: "BVOC FY",
    batch_no: "1",
    fatherName: "Test Father",
    fatherPhone: "9999999999",
    fatherEmail: "testfather@example.com",
    motherName: "Test Mother",
    motherPhone: "8888888888",
    motherEmail: "testmother@example.com",
    password: "password123"
  };

  try {
    const res = await fetch("http://localhost:5006/api/students/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testRegister();
