import { VStack, Image } from '@chakra-ui/react'
import React, { useState, useEffect } from 'react'
import {
  Button,
  Field,
  Fieldset,
  Input,
  FileUpload,
  Float,
} from '@chakra-ui/react'
import { HiUpload } from 'react-icons/hi'
import { LuFileImage, LuX } from 'react-icons/lu'
import { PasswordInput } from '@/components/ui/password-input'

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

    if (password !== confirmpassword) {
      alert('Passwords do not match')
      return
    }

    console.log({
      name,
      email,
      password,
      pic,
    })
  }

  return (
    <VStack spaceY="5px">
      <Fieldset.Root size="lg" maxW="md">
        <Fieldset.Content>
          <Field.Root id="first-name" required>
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

          <FileUpload.Root
            accept="image/*"
            maxFiles={1}
            onValueChange={(details) => {
              console.log(details.acceptedFiles)
            }}
          >
            <FileUpload.HiddenInput />
            <FileUpload.Trigger asChild>
              <Button
                variant="outline"
                size="sm"
                color="blue.500"
              >
                <HiUpload /> Upload file
              </Button>
            </FileUpload.Trigger>
            <FileUpload.List />
          </FileUpload.Root>
        </Fieldset.Content>

        <Button type="submit" mt={8} fontSize="2xl">
          Submit
        </Button>
      </Fieldset.Root>
    </VStack>
  )
}

export default Signup
