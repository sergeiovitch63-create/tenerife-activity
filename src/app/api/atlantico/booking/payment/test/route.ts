/**
 * GET /api/atlantico/booking/payment/test
 * 
 * Test page to debug payment endpoint
 * Shows a form to test the payment endpoint directly
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Payment Endpoint Test</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input, select { width: 100%; padding: 8px; box-sizing: border-box; }
    button { background: #0070f3; color: white; padding: 10px 20px; border: none; cursor: pointer; }
    button:hover { background: #0051cc; }
    .info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .error { background: #fee; color: #c00; padding: 10px; border-radius: 5px; margin-top: 10px; }
    .success { background: #efe; color: #0c0; padding: 10px; border-radius: 5px; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>Payment Endpoint Test</h1>
  <div class="info">
    <strong>Instructions:</strong>
    <ul>
      <li><strong>IMPORTANT:</strong> Before testing, verify that the date/time is available using the limits API</li>
      <li>Check availability: <a href="/api/atlantico/limits?eventId=509&lang=ENG&month=2026-02-01" target="_blank">/api/atlantico/limits?eventId=509&lang=ENG&month=2026-02-01</a></li>
      <li>Fill in the form below with <strong>available</strong> date/time</li>
      <li>Click "Submit Payment" to test the /api/atlantico/booking/payment endpoint</li>
      <li>If you see error "-1", the date/time is not available or parameters are invalid</li>
      <li>Check the browser console and server logs for debugging information</li>
    </ul>
  </div>
  
  <div class="error" id="errorMessage" style="display: none;">
    <strong>Error:</strong> <span id="errorText"></span>
  </div>
  
  <form id="paymentForm" method="POST" action="/api/atlantico/booking/payment" target="_blank">
    <div class="form-group">
      <label>t_id (Event ID):</label>
      <input type="text" name="t_id" value="509" required>
    </div>
    
    <div class="form-group">
      <label>t_group (Group ID):</label>
      <input type="text" name="t_group" value="509" required>
      <small style="color: #666;">Try 509 or check event details to find the correct group</small>
    </div>
    
    <div class="form-group">
      <label>language:</label>
      <select name="language" required>
        <option value="ENG">ENG</option>
        <option value="CAS">CAS</option>
        <option value="FRA">FRA</option>
        <option value="RUS">RUS</option>
        <option value="ALE">ALE</option>
        <option value="ITA">ITA</option>
      </select>
    </div>
    
    <div class="form-group">
      <label>tourDate (YYYY-MM-DD):</label>
      <input type="date" name="tourDate" value="2026-02-20" required>
    </div>
    
    <div class="form-group">
      <label>sesTime (HH:mm or 00:00, or leave empty for wdays_only):</label>
      <input type="text" name="sesTime" value="" placeholder="Leave empty for wdays_only mode">
      <small style="color: #666;">For wdays_only mode, leave empty or use "00:00"</small>
    </div>
    
    <div class="form-group">
      <label>adults:</label>
      <input type="number" name="adults" value="1" min="1" required>
    </div>
    
    <div class="form-group">
      <label>childs:</label>
      <input type="number" name="childs" value="0" min="0">
    </div>
    
    <div class="form-group">
      <label>infants:</label>
      <input type="number" name="infants" value="0" min="0">
    </div>
    
    <div class="form-group">
      <label>name:</label>
      <input type="text" name="name" value="Test User" required>
    </div>
    
    <div class="form-group">
      <label>email:</label>
      <input type="email" name="email" value="test@example.com" required>
    </div>
    
    <div class="form-group">
      <label>phone:</label>
      <input type="tel" name="phone" value="+34600000000" required>
    </div>
    
    <div class="form-group">
      <label>hotel (optional):</label>
      <input type="text" name="hotel" value="">
    </div>
    
    <div class="form-group">
      <label>room (optional):</label>
      <input type="text" name="room" value="">
    </div>
    
    <button type="submit">Submit Payment</button>
  </form>
  
  <div id="result"></div>
  
  <script>
    // Check availability before submitting
    async function checkAvailability() {
      const t_id = document.querySelector('input[name="t_id"]').value;
      const lang = document.querySelector('select[name="language"]').value;
      const tourDate = document.querySelector('input[name="tourDate"]').value;
      
      if (!t_id || !tourDate) return;
      
      // Extract month from date (YYYY-MM-DD -> YYYY-MM-01)
      const month = tourDate.substring(0, 7) + '-01';
      const limitsUrl = \`/api/atlantico/limits?eventId=\${t_id}&lang=\${lang}&month=\${month}\`;
      
      try {
        const response = await fetch(limitsUrl);
        const data = await response.json();
        
        if (data.sessionsByDate) {
          const dateKey = tourDate.replace(/-/g, ''); // YYYY-MM-DD -> YYYYMMDD
          const sessions = data.sessionsByDate[dateKey];
          
          if (sessions && Array.isArray(sessions) && sessions.length > 0) {
            const times = sessions.map(s => s.time || s).filter(t => t && t !== '00:00');
            if (times.length > 0) {
              console.log('[PAYMENT_TEST] Available times for', tourDate + ':', times);
              // Update sesTime input with first available time if empty
              const sesTimeInput = document.querySelector('input[name="sesTime"]');
              if (!sesTimeInput.value && times[0]) {
                sesTimeInput.value = times[0];
                sesTimeInput.placeholder = 'Available: ' + times.join(', ');
              }
            }
          }
        }
      } catch (error) {
        console.warn('[PAYMENT_TEST] Could not check availability:', error);
      }
    }
    
    // Check availability when date changes
    document.querySelector('input[name="tourDate"]').addEventListener('change', checkAvailability);
    document.querySelector('input[name="t_id"]').addEventListener('change', checkAvailability);
    
    document.getElementById('paymentForm').addEventListener('submit', function(e) {
      console.log('[PAYMENT_TEST] Form submitted');
      console.log('[PAYMENT_TEST] Action:', this.action);
      console.log('[PAYMENT_TEST] Method:', this.method);
      
      // The form will submit normally, opening in new tab
      // Check the new tab for the response
    });
  </script>
</body>
</html>
  `
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

