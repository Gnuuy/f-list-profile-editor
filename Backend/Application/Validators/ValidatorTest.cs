using Application.DTO.Create;
using Domain;
using FluentValidation;

namespace Application.Validators;

public class ValidatorTest : AbstractValidator<TestCreateDTO>
{
    public ValidatorTest()
    {
        RuleFor(u=>u.testMessage).NotEmpty().WithMessage("Test message cannot be empty");
    }
}