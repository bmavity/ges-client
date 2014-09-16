var username = 'admin'
	, password = 'changeit'

Object.defineProperties(module.exports, {
  admin: { value: username }
, defaultAdminPassword: { value: password }
, defaultCredentials: { value: {
		username: username
	, password: password
	}}
})
