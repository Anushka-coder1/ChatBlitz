import { VStack, Button, Field, Fieldset, Input, Image } from '@chakra-ui/react'
import React, { useState, useEffect } from 'react'
import { PasswordInput } from '@/components/ui/password-input'
import { HiUpload } from 'react-icons/hi'
import { FileUpload } from '@chakra-ui/react'

const Signup = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [confirmpassword, setConfirmPassword] = useState('')
  const [password, setPassword] = useState('')
  const [pic, setPic] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!pic) {
      setPreview(null)
      return
    }

    const objectUrl = URL.createObjectURL(pic)
    setPreview(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [pic])

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!name || !email || !password || !confirmpassword) {
      alert('Please fill all fields')
      return
    }

    if (password !== confirmpassword) {
      alert('Passwords do not match')
      return
    }

    console.log({ name, email, password, pic })
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack spacing="5px">
        <Fieldset.Root size="lg" maxW="md">
          <Fieldset.Content>
            <Field.Root required>
              <Field.Label>Name</Field.Label>
              <Input
                value={name}
                placeholder="Enter Name"
                onChange={(e) => setName(e.target.value)}
              />
            </Field.Root>

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

            <Field.Root required>
              <Field.Label>Confirm Password</Field.Label>
              <PasswordInput
                value={confirmpassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field.Root>

            {/* File Upload */}
            <FileUpload.Root
              accept="image/*"
              maxFiles={1}
              onValueChange={(details) => {
                const file = details.acceptedFiles[0]
                if (file) setPic(file)
              }}
            >
              <FileUpload.HiddenInput />

              <FileUpload.Trigger asChild>
                <Button variant="outline" size="sm" color="black">
                  <HiUpload /> Upload Profile Picture
                </Button>
              </FileUpload.Trigger>

              <FileUpload.List />
            </FileUpload.Root>

            <Button
              type="submit"
              mt={6}
              bg ="blue.400"
              width="100%"
              fontSize="lg"
            >
              Sign Up
            </Button>
          </Fieldset.Content>
        </Fieldset.Root>
      </VStack>
    </form>
  )
}

export default Signup
