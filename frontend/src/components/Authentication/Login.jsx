import { VStack, Button, Field, Fieldset, Input } from '@chakra-ui/react'
import React, { useState } from 'react'
import { PasswordInput } from '@/components/ui/password-input'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submitHandler = (e) => {
    e.preventDefault()
    console.log(email, password)
  }

  return (
    <form onSubmit={submitHandler}>
      <VStack spacing="5px">
        <Fieldset.Root size="lg" maxW="md">
          <Fieldset.Content>

            <Field.Root required>
              <Field.Label>Email address</Field.Label>
              <Input
                value={email}
                type="email"
                placeholder="abc@gmail.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label>Password</Field.Label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field.Root>

            <Button
                type="submit"
                mt={4}
                bg ="blue.400"
                width="100%"
                size="lg"
              >
                Login
              </Button>

          </Fieldset.Content>
        </Fieldset.Root>
      </VStack>
    </form>
  )
}

export default Login