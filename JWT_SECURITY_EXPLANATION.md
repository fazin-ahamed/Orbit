# 🔐 JWT Security Configuration Guide

## 🚨 **IMPORTANT: JWT_SECRET ≠ JWT_REFRESH_SECRET**

### ❌ **WRONG - Same Secret for Both:**
```bash
JWT_SECRET=my-secret-key
JWT_REFRESH_SECRET=my-secret-key  # DON'T DO THIS!
```

### ✅ **CORRECT - Different Secrets for Each:**
```bash
JWT_SECRET=super-secure-access-token-secret-2025
JWT_REFRESH_SECRET=super-secure-refresh-token-secret-2025
```

## 🛡️ **Why Different Secrets Are Critical:**

### **1. Security Separation**
- **Access Tokens**: Short-lived (15 minutes) - used for API calls
- **Refresh Tokens**: Long-lived (7-30 days) - used to get new access tokens
- **Different risks, different protection levels**

### **2. Compromise Protection**
- If **access token secret** is compromised: Limited impact (15 min tokens)
- If **refresh token secret** is compromised: Longer-term access
- **Different secrets contain the blast radius**

### **3. Lifecycle Management**
- **Access Tokens**: Can be invalidated immediately
- **Refresh Tokens**: Can be rotated independently
- **Different secrets allow flexible token management**

### **4. Industry Best Practice**
- OWASP recommendations
- JWT RFC standards
- Enterprise security frameworks
- All use separate secrets

## 🔑 **How They Work in BusinessOS:**

### **Access Token (JWT_SECRET)**
```javascript
// Access token - expires in 15 minutes
const accessToken = jwt.sign(payload, JWT_SECRET, { 
  expiresIn: '15m' 
});
```

### **Refresh Token (JWT_REFRESH_SECRET)**  
```javascript
// Refresh token - expires in 7 days
const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { 
  expiresIn: '7d' 
});
```

## 🛠️ **Environment Variable Setup:**

### **Production Values:**
```bash
# Generate secure secrets:
# Access Token Secret (32+ characters)
JWT_SECRET=BusinessOS-Access-Token-Secret-2025-10-30-Super-Secure-Key

# Refresh Token Secret (32+ characters)  
JWT_REFRESH_SECRET=BusinessOS-Refresh-Token-Secret-2025-10-30-Different-Secure-Key

# Both should be:
# - 32+ characters long
# - Include letters, numbers, symbols
# - Be completely unique from each other
# - Be securely generated
```

### **How to Generate Secure Secrets:**
```bash
# Option 1: Using openssl
openssl rand -base64 32

# Option 2: Using node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Use a password generator
# Make them 32+ characters with mixed case, numbers, symbols
```

## 🚀 **For BusinessOS Deployment:**

### **In Render.com Dashboard:**
1. **Environment Variables** section
2. **Add Variable**: `JWT_SECRET` = your-access-token-secret
3. **Add Variable**: `JWT_REFRESH_SECRET` = your-refresh-token-secret  
4. **Make sure they are different!**

### **In Railway.app:**
```bash
railway variables set JWT_SECRET=your-access-token-secret
railway variables set JWT_REFRESH_SECRET=your-refresh-token-secret
```

### **In Heroku:**
```bash
heroku config:set JWT_SECRET=your-access-token-secret
heroku config:set JWT_REFRESH_SECRET=your-refresh-token-secret
```

## ✅ **Security Checklist:**

- [ ] **Different values**: JWT_SECRET ≠ JWT_REFRESH_SECRET
- [ ] **32+ characters**: Both secrets are sufficiently long
- [ ] **Complex characters**: Include letters, numbers, symbols
- [ ] **Unique generation**: Don't reuse secrets between environments
- [ ] **Secure storage**: Set in platform environment variables, never commit to code

## 🎯 **Final Security Best Practices:**

1. **Never hardcode secrets** in source code
2. **Never commit secrets** to version control  
3. **Rotate secrets regularly** (every 6-12 months)
4. **Use different secrets** for development, staging, production
5. **Monitor token usage** for unusual patterns
6. **Implement token revocation** for compromised tokens

---

**Remember: Two different secrets = Two layers of security! 🔒**