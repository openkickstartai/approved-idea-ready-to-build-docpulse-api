# Curl API Examples

## List all users

```bash
curl https://api.example.com/users
```

## Create a user

```bash
curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d '{"name":"Ada"}'
```

## Delete a specific user

```bash
curl -X DELETE https://api.example.com/users/42
```

## Update a user with PUT

```bash
curl -X PUT https://api.example.com/users/7 -d '{"name":"Grace"}'
```
